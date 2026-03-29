import { Type } from "@google/genai";

export const upgradeSchema = {
  type: Type.OBJECT,
  properties: {
    wittyComment: { type: Type.STRING, description: "Reaction to input in Chinese." },
    targetPhrase: { type: Type.STRING, description: "The upgraded phrase in the target language." },
    targetPhraseTranslation: { type: Type.STRING, description: "Chinese translation of the phrase." },
    explanation: { type: Type.STRING, description: "Explanation in Chinese. Max 4 lines." },
    scenarioContext: { type: Type.STRING, description: "Usage scenario description in Chinese." },
    scenarioExample: { type: Type.STRING, description: "A sample sentence fitting the scenario in the target language." },
    scenarioExampleTranslation: { type: Type.STRING, description: "Chinese translation of the scenario example sentence." },
  },
  required: [
    "wittyComment",
    "targetPhrase",
    "targetPhraseTranslation",
    "explanation",
    "scenarioContext",
    "scenarioExample",
    "scenarioExampleTranslation",
  ],
};

export const lookupSchema = {
  type: Type.OBJECT,
  properties: {
    targetPhrase: { type: Type.STRING, description: "The word/phrase in target language." },
    definitionTarget: { type: Type.STRING, description: "A simple, easy-to-understand definition in the TARGET language." },
    explanation: { type: Type.STRING, description: "Max 2 concise bullet points in Chinese. NOT a translation of definitionTarget." },
    scenario: { type: Type.STRING, description: "Usage context in Chinese." },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING, description: "The sentence in the TARGET language." },
          cn: { type: Type.STRING, description: "The Chinese translation." },
        },
        required: ["en", "cn"],
      },
      description: "Exactly two bilingual example sentences.",
    },
  },
  required: ["targetPhrase", "definitionTarget", "explanation", "scenario", "examples"],
};
