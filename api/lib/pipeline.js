import { generateStructuredJson } from "./providers/gemini.js";

/** 统一生成入口：后续可在此串联 OpenAI / Azure 等 fallback。 */
export async function runChatPipeline(opts) {
  return generateStructuredJson(opts);
}
