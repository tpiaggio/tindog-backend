import {generate} from "@genkit-ai/ai";
import {Part} from "@genkit-ai/ai/model";
import {firebaseAuth} from "@genkit-ai/firebase/auth";
import {onFlow} from "@genkit-ai/firebase/functions";
import {gemini15Flash} from "@genkit-ai/googleai";
import * as z from "zod";
import {getStorage, getDownloadURL} from "firebase-admin/storage";
import {logger} from "firebase-functions/v2";
import {DogSchema} from "./schemas";

const dogDataFlow = onFlow(
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

export default dogDataFlow;
