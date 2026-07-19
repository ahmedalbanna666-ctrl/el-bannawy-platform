import { registerAs } from "@nestjs/config";

export default registerAs("ai", () => ({
  apiKey: process.env.AI_API_KEY ?? "",
  model: process.env.AI_MODEL ?? "gpt-4o-mini",
  endpoint: process.env.AI_ENDPOINT ?? "https://api.openai.com/v1/chat/completions",
}));
