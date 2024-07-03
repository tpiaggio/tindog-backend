import {runFlow} from "@genkit-ai/flow";
import {getFirestore} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import DogSchema from "../schemas/dogSchema";
import initialChatMessage from "../flows/initialChatMessage";
import {getThumbnailUrl} from "../utils/thumbnail";

const matchDogs = onCall(async (request) => {
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
  const chatRef = await db.collection("chats").add({
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
    updatedAt: new Date(),
  });
  return {
    success: true,
    text: initialMessage,
    chatId: chatRef.id,
  };
});

export default matchDogs;
