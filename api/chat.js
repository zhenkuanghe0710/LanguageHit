import { ApiError } from "@google/genai";
import { runChatPipeline } from "./lib/pipeline.js";
import { upgradeSchema, lookupSchema } from "./lib/schemas.js";
import {
  getSystemInstructionUpgrade,
  getSystemInstructionLookup,
  TargetLanguage,
} from "./lib/prompts.js";

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_MODES = new Set(["rewrite", "flashcard"]);
const LANGS = new Set(Object.values(TargetLanguage));

/** Vercel 打包后 instanceof ApiError 可能失效，用字段判断 */
function isUpstreamApiError(e) {
  return (
    e instanceof ApiError ||
    (e != null && e.name === "ApiError" && typeof e.status === "number")
  );
}

function safeErrorSnippet(e, max = 220) {
  const raw = [e?.name, e?.message].filter(Boolean).join(": ");
  return String(raw).replace(/\s+/g, " ").slice(0, max);
}

function causeSnippet(e) {
  const c = e?.cause;
  if (c == null || typeof c !== "object") return "";
  const parts = [c.code, c.errno, c.message, c.reason].filter(
    (x) => x != null && String(x).trim() !== ""
  );
  return String(parts.join(" ")).replace(/\s+/g, " ").slice(0, 180);
}

/** Node/undici：连不上 Google 时常为 TypeError: fetch failed，真正原因多在 error.cause */
function isFetchNetworkFailure(e) {
  const msg = String(e?.message || "");
  if (e instanceof TypeError && /fetch failed/i.test(msg)) return true;
  const c = e?.cause;
  if (c != null && typeof c === "object") {
    const code = c.code ?? c.errno;
    if (typeof code === "string") {
      if (/^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ECONNRESET)$/.test(code)) return true;
      if (/^ERR_|^UND_ERR_|^CERT_/i.test(code)) return true;
    }
  }
  return false;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/** 从 Gemini SDK 的 usageMetadata 挑出前端 `GeminiTokenUsage` 所需字段 */
function pickGeminiUsage(usageMetadata) {
  if (usageMetadata == null || typeof usageMetadata !== "object") return undefined;
  const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usageMetadata;
  const out = {};
  if (typeof promptTokenCount === "number") out.promptTokenCount = promptTokenCount;
  if (typeof candidatesTokenCount === "number") out.candidatesTokenCount = candidatesTokenCount;
  if (typeof totalTokenCount === "number") out.totalTokenCount = totalTokenCount;
  return Object.keys(out).length > 0 ? out : undefined;
}

async function readJsonBody(req) {
  if (req.body != null && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const buf = await new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("BODY_TOO_LARGE"), { code: "BODY_TOO_LARGE" }));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
  const raw = buf.toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("INVALID_JSON");
    err.code = "INVALID_JSON";
    throw err;
  }
}

export default async function handler(req, res) {
  const rid = Math.random().toString(36).slice(2, 10);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      success: false,
      mode: null,
      reply: null,
      provider: "none",
      error: "METHOD_NOT_ALLOWED",
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    const code = e.code === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "INVALID_JSON";
    console.warn("[chat]", rid, code);
    return sendJson(res, 400, {
      success: false,
      mode: null,
      reply: null,
      provider: "gemini",
      error: code,
    });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const mode = typeof body.mode === "string" ? body.mode : "";
  const language =
    typeof body.language === "string" && LANGS.has(body.language)
      ? body.language
      : TargetLanguage.ENGLISH;

  if (!message.trim()) {
    console.warn("[chat]", rid, "empty_message");
    return sendJson(res, 400, {
      success: false,
      mode: mode || null,
      reply: null,
      provider: "gemini",
      error: "MISSING_MESSAGE",
    });
  }

  if (!ALLOWED_MODES.has(mode)) {
    console.warn("[chat]", rid, "bad_mode");
    return sendJson(res, 400, {
      success: false,
      mode: null,
      reply: null,
      provider: "gemini",
      error: "INVALID_MODE",
    });
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    console.error("[chat]", rid, "missing_gemini_api_key");
    return sendJson(res, 503, {
      success: false,
      mode,
      reply: null,
      provider: "gemini",
      error: "SERVICE_MISCONFIGURED",
    });
  }

  const isRewrite = mode === "rewrite";
  const systemInstruction = isRewrite
    ? getSystemInstructionUpgrade(language)
    : getSystemInstructionLookup(language);
  const schema = isRewrite ? upgradeSchema : lookupSchema;

  try {
    const { text, usageMetadata } = await runChatPipeline({
      apiKey,
      contents: message.trim(),
      systemInstruction,
      schema,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
    });

    const geminiUsage = pickGeminiUsage(usageMetadata);

    console.log("[chat]", rid, mode, "ok", "chars", text.length);
    return sendJson(res, 200, {
      success: true,
      mode,
      reply: text,
      provider: "gemini",
      ...(geminiUsage ? { geminiUsage } : {}),
    });
  } catch (e) {
    if (e?.message === "UPSTREAM_TIMEOUT") {
      console.warn("[chat]", rid, mode, "timeout");
      return sendJson(res, 504, {
        success: false,
        mode,
        reply: null,
        provider: "gemini",
        error: "UPSTREAM_TIMEOUT",
      });
    }
    if (isFetchNetworkFailure(e)) {
      const extra = causeSnippet(e);
      console.warn("[chat]", rid, mode, "network", safeErrorSnippet(e), extra || "(no cause)");
      return sendJson(res, 502, {
        success: false,
        mode,
        reply: null,
        provider: "gemini",
        error: "UPSTREAM_NETWORK",
      });
    }
    if (isUpstreamApiError(e)) {
      const st = e.status ?? "?";
      console.warn("[chat]", rid, mode, "upstream", st, safeErrorSnippet(e));
      return sendJson(res, 502, {
        success: false,
        mode,
        reply: null,
        provider: "gemini",
        error: "UPSTREAM_ERROR",
      });
    }
    const tag = e?.message === "EMPTY_MODEL_REPLY" ? "EMPTY_MODEL_REPLY" : "UPSTREAM_ERROR";
    console.warn("[chat]", rid, mode, "err", tag, safeErrorSnippet(e));
    return sendJson(res, 502, {
      success: false,
      mode,
      reply: null,
      provider: "gemini",
      error: tag,
    });
  }
}
