import {generate} from "@genkit-ai/ai";
import {Part} from "@genkit-ai/ai/model";
import {configureGenkit} from "@genkit-ai/core";
import {firebaseAuth} from "@genkit-ai/firebase/auth";
import {onFlow} from "@genkit-ai/firebase/functions";
import {defineFlow, runFlow} from "@genkit-ai/flow";
import {googleAI, gemini15Flash} from "@genkit-ai/googleai";
import * as z from "zod";
import {firebase} from "@genkit-ai/firebase";
import {defineSecret, defineString} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {getStorage, getDownloadURL} from "firebase-admin/storage";
import {getFirestore} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import path from "path";

defineSecret("GOOGLE_GENAI_API_KEY");
defineString("STORAGE_BUCKET");

initializeApp({
  storageBucket: process.env.STORAGE_BUCKET,
});

configureGenkit({
  plugins: [firebase(), googleAI({apiVersion: "v1beta"})],
  logLevel: "debug",
  enableTracingAndMetrics: true,
});

const dogSizes = ["small", "medium", "large"] as const;

const DogSchema = z.object({
  isDog: z.boolean().optional().describe("whether the image contains a dog"),
  breed: z.string().optional().describe("the breed of the dog"),
  size: z.enum(dogSizes).optional().describe("the size of the dog"),
  description: z.string().optional().describe("a description of the dog"),
});

export const dogDataFlow = onFlow(
  {
    name: "dogDataFlow",
    httpsOptions: {cors: "*"},
    inputSchema: z.object({
      filePath: z.string(),
    }),
    outputSchema: DogSchema,
    authPolicy: firebaseAuth((user) => {
      if (!user.email_verified) {
        throw new Error("Verified email required to run flow");
      }
    }),
  },
  async ({filePath}) => {
    const fileRef = getStorage().bucket().file(filePath);
    const [exists] = await fileRef.exists();

    if (!exists) {
      throw new Error("File does not exist");
    }

    const fileType = fileRef.metadata.contentType;

    if (!fileType || !fileType.startsWith("image/")) {
      throw new Error("Provided file is not an image");
    }

    await fileRef.makePublic();
    const downloadURL = await getDownloadURL(fileRef);

    const parts: Part[] = [
      {
        media: {
          url: downloadURL,
          contentType: fileType,
        },
      },
      {
        text: "What's the breed of this dog? Please provide a breed name. Also, try to determine the dog's size based on the image. Add a description considering the breed, it should be friendly and engaging, as if its owner wrote it, keep it short. If there's not a dog in this image, please let me know.",
      },
    ];

    try {
      const response = await generate({
        model: gemini15Flash,
        prompt: parts,
        output: {schema: DogSchema},
      });
      const output = response.output();

      return output || {isDog: false};
    } catch (error) {
      console.log(error);
      // TODO: Delete the file if it's not needed anymore
      logger.error("Error generating dog data", error);
      return {
        isDog: false,
      };
    }
  }
);

export const initialChatMessage = defineFlow(
  {
    name: "initialChatMessage",
    inputSchema: z.object({
      firstDog: DogSchema,
      secondDog: DogSchema,
    }),
    outputSchema: z.string(),
  },
  async ({firstDog, secondDog}) => {
    const prompt = `Two dog owners have matched in a social media platform called Tindog focused on dogs. They are about to start a conversation. Write the first message as if you were Tindog encouraging the dog owners to start interacting with each other. The message should be friendly and engaging. We should take into consideration the breed of the dogs and find common interests and temperaments based on the following information:\n\nFirst dog:\n\nBreed: ${firstDog.breed} \nSize: ${firstDog.size} \nDescription: ${firstDog.description} \n\nSecond dog:\n\nBreed: ${secondDog.breed}  \nSize: ${secondDog.size} \nDescription: ${secondDog.description}.`;
    const response = await generate({
      model: gemini15Flash,
      prompt: prompt,
    });

    return response.text();
  }
);

export const matchDogs = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const {firstDogId, secondDogId}: {firstDogId?: string; secondDogId?: string} =
    request.data;
  // Check if the request has the required arguments
  if (!firstDogId || !secondDogId) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with two document IDs."
    );
  }
  const db = getFirestore();
  const firstDogRef = db.collection("dogs").doc(firstDogId);
  const secondDogRef = db.collection("dogs").doc(secondDogId);
  const [firstDog, secondDog] = await Promise.all([
    firstDogRef.get(),
    secondDogRef.get(),
  ]);
  // Check if dogs exist
  if (!firstDog.exists || !secondDog.exists) {
    throw new HttpsError(
      "invalid-argument",
      `The function must be called with valid document IDs, firstDogId: ${firstDog.exists}, secondDogId: ${secondDog.exists}`
    );
  }
  // Check if one of the dogs belong to the authenticated user
  if (
    firstDog.data()?.userId !== request.auth?.uid &&
    secondDog.data()?.userId !== request.auth?.uid
  ) {
    throw new HttpsError(
      "permission-denied",
      "Neither of the dogs belong to the authenticated user."
    );
  }
  // Check if a chat between these two users already exists
  const userIds = [firstDog.data()?.userId, secondDog.data()?.userId].sort();
  const chatExists = await db
    .collection("chats")
    .where("userIds", "==", userIds)
    .get();
  // Check if a chat between these two users already exists
  if (chatExists.size > 0) {
    throw new HttpsError(
      "already-exists",
      "A chat between these two users already exists."
    );
  }
  // Get initial chat message
  const firstDogSchema = DogSchema.parse(firstDog.data());
  const secondDogSchema = DogSchema.parse(secondDog.data());
  const initialMessage = await runFlow(initialChatMessage, {
    firstDog: firstDogSchema,
    secondDog: secondDogSchema,
  });
  // Create a new chat between the two users
  await db.collection("chats").add({
    dogs: [
      {
        name: firstDog.data()?.name,
        dogId: firstDog.id,
        userId: firstDog.data()?.userId,
        thumbnailUrl: getThumbnailUrl(firstDog.data()?.filePath),
      },
      {
        name: secondDog.data()?.name,
        dogId: secondDog.id,
        userId: secondDog.data()?.userId,
        thumbnailUrl: getThumbnailUrl(secondDog.data()?.filePath),
      },
    ],
    userIds: userIds,
    initialMessage: {
      readBy: [],
      text: initialMessage,
      timestamp: new Date(),
    },
  });
  return {
    success: true,
    text: initialMessage,
  };
});

const getThumbnailUrl = (filePath: string) => {
  if (!filePath) {
    return "";
  }
  // filePath will always have 'dogs/' at the beginning and the image extension at the end
  const imageExtension = path.extname(filePath);
  const imagePath = filePath.replace("dogs/", "").replace(imageExtension, "");
  return `https://storage.googleapis.com/${
    process.env.STORAGE_BUCKET
  }/${encodeURIComponent(
    `dogs/thumbnails/${imagePath}_200x200${imageExtension}`
  )}`;
};
