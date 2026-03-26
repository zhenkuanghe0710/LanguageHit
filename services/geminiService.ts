import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AppMode, GeneratedCardData, TargetLanguage } from "../types";
import { getSystemInstructionLookup, getSystemInstructionUpgrade } from "../constants";

const apiKey = typeof process !== "undefined" ? process.env.API_KEY : "";
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const upgradeSchema: Schema = {
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
  required: ["wittyComment", "targetPhrase", "targetPhraseTranslation", "explanation", "scenarioContext", "scenarioExample", "scenarioExampleTranslation"],
};

const lookupSchema: Schema = {
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
        required: ["en", "cn"]
      },
      description: "Exactly two bilingual example sentences."
    },
  },
  required: ["targetPhrase", "definitionTarget", "explanation", "scenario", "examples"],
};

export const generateCardContent = async (input: string, mode: AppMode, lang: TargetLanguage): Promise<GeneratedCardData> => {
  if (!apiKey?.trim()) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }

  const modelName = "gemini-3-flash-preview";
  
  const isUpgrade = mode === AppMode.UPGRADE;
  const systemInstruction = isUpgrade ? getSystemInstructionUpgrade(lang) : getSystemInstructionLookup(lang);
  const schema = isUpgrade ? upgradeSchema : lookupSchema;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: input,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const json = JSON.parse(text);
    const u = response.usageMetadata;

    return {
      id: crypto.randomUUID(),
      type: mode,
      language: lang,
      userInput: input,
      targetPhrase: json.targetPhrase,
      targetPhraseTranslation: json.targetPhraseTranslation,
      wittyComment: json.wittyComment,
      
      // Keep explanation pure for Lookup (Chinese), store Definition separately
      explanation: json.explanation,
      definitionTarget: json.definitionTarget,
        
      // Handle schema differences: Upgrade uses (scenarioContext + scenarioExample), Lookup uses (scenario)
      scenario: json.scenarioContext || json.scenario, 
      scenarioExample: json.scenarioExample,
      scenarioExampleTranslation: json.scenarioExampleTranslation,
      examples: json.examples,
      timestamp: Date.now(),
      geminiUsage:
        u &&
        (u.promptTokenCount != null ||
          u.candidatesTokenCount != null ||
          u.totalTokenCount != null)
          ? {
              promptTokenCount: u.promptTokenCount,
              candidatesTokenCount: u.candidatesTokenCount,
              totalTokenCount: u.totalTokenCount,
            }
          : undefined,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};