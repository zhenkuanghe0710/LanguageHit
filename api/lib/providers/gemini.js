import { GoogleGenAI } from "@google/genai";

// 须与根目录 constants.ts 中 SERVER_CHAT_MODEL_LABEL 保持一致（此处不能 import .ts）
const MODEL_ID = "gemini-2.5-flash-lite";

export async function generateStructuredJson(opts) {
  const { apiKey, contents, systemInstruction, schema, timeoutMs } = opts;
  const ai = new GoogleGenAI({ apiKey });

  const call = ai.models.generateContent({
    model: MODEL_ID,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.7,
    },
  });

  const result = await Promise.race([
    call,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("UPSTREAM_TIMEOUT")), timeoutMs)
    ),
  ]);

  const text = result.text;
  if (!text) {
    const err = new Error("EMPTY_MODEL_REPLY");
    err.code = "EMPTY_MODEL_REPLY";
    throw err;
  }

  return { text, usageMetadata: result.usageMetadata, modelId: MODEL_ID };
}

export { MODEL_ID };
