import * as z from "zod";

const dogSizes = ["small", "medium", "large"] as const;

export const DogSchema = z.object({
  isDog: z.boolean().optional().describe("whether the image contains a dog"),
  breed: z.string().optional().describe("the breed of the dog"),
  size: z.enum(dogSizes).optional().describe("the size of the dog"),
  description: z.string().optional().describe("a description of the dog"),
});
