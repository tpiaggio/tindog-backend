import {generate} from "@genkit-ai/ai";
import {defineFlow} from "@genkit-ai/flow";
import {gemini15Flash} from "@genkit-ai/googleai";
import * as z from "zod";
import DogSchema from "../schemas/dogSchema";

const initialChatMessage = defineFlow(
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

export default initialChatMessage;
