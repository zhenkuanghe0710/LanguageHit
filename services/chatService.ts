import {
  AppMode,
  GeneratedCardData,
  GeminiTokenUsage,
  TargetLanguage,
} from "../types";

function parseGeminiUsage(raw: unknown): GeminiTokenUsage | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const g = raw as Record<string, unknown>;
  const out: GeminiTokenUsage = {};
  if (typeof g.promptTokenCount === "number") out.promptTokenCount = g.promptTokenCount;
  if (typeof g.candidatesTokenCount === "number")
    out.candidatesTokenCount = g.candidatesTokenCount;
  if (typeof g.totalTokenCount === "number") out.totalTokenCount = g.totalTokenCount;
  return Object.keys(out).length > 0 ? out : undefined;
}

const MODE_TO_API: Record<AppMode, "rewrite" | "flashcard"> = {
  [AppMode.UPGRADE]: "rewrite",
  [AppMode.LOOKUP]: "flashcard",
};

const CLIENT_FETCH_MS = 16_000;

export async function generateCardContent(
  input: string,
  mode: AppMode,
  lang: TargetLanguage
): Promise<GeneratedCardData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_FETCH_MS);

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        mode: MODE_TO_API[mode],
        language: lang,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const payload: Record<string, unknown> = await res.json().catch(() => ({}));
  const success = payload.success === true;
  const reply = payload.reply;

  if (!success || typeof reply !== "string") {
    const code =
      typeof payload.error === "string" && payload.error
        ? payload.error
        : `HTTP_${res.status}`;
    throw new Error(code);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(reply);
  } catch {
    throw new SyntaxError("invalid json in reply");
  }

  const geminiUsage = parseGeminiUsage(payload.geminiUsage);

  return {
    id: crypto.randomUUID(),
    type: mode,
    language: lang,
    userInput: input,
    targetPhrase: json.targetPhrase as string,
    targetPhraseTranslation: json.targetPhraseTranslation as string | undefined,
    wittyComment: json.wittyComment as string | undefined,
    explanation: json.explanation as string,
    definitionTarget: json.definitionTarget as string | undefined,
    scenario: (json.scenarioContext || json.scenario) as string,
    scenarioExample: json.scenarioExample as string | undefined,
    scenarioExampleTranslation: json.scenarioExampleTranslation as string | undefined,
    examples: json.examples as GeneratedCardData["examples"],
    timestamp: Date.now(),
    ...(geminiUsage ? { geminiUsage } : {}),
  };
}
