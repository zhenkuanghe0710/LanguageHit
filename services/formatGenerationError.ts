import { ApiError } from "@google/genai";
import { DEFAULT_GEMINI_MODEL_ID } from "../constants";

const resolvedModelId =
  (process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL_ID;

/**
 * Turns SDK / runtime errors into user-visible messages (Chinese).
 * Full error is still logged in App.tsx via console.error.
 */
export function formatGenerationError(error: unknown): string {
  if (error instanceof ApiError) {
    const { status, message } = error;
    if (status === 400) {
      return `请求参数被拒绝（400）。${message || "请检查输入长度或内容。"}`;
    }
    if (status === 401 || status === 403) {
      return [
        `API 密钥被拒绝（${status}）。`,
      ].join(" ");
    }
    if (status === 404) {
      return `模型不可用（404）。当前使用：${resolvedModelId}。请确认该密钥在 Google AI Studio 中可访问此模型，或在部署环境设置 GEMINI_MODEL 为账号可用的模型 ID。`;
    }
    if (status === 429) {
      return `触发频率或配额限制（429）。请稍后再试。${message ? ` ${message}` : ""}`;
    }
    if (status !== undefined && status >= 500) {
      return `Gemini 服务端异常（${status}）。请稍后重试。`;
    }
    return `请求失败${status != null ? `（${status}）` : ""}：${message || "无详细说明"}`;
  }

  if (error instanceof SyntaxError) {
    return "模型返回内容无法解析为 JSON。可尝试缩短或改写输入后重试。";
  }

  if (error instanceof Error) {
    if (error.message === "No response from AI") {
      return "模型未返回正文（可能被安全策略拦截或候选为空）。请换一句输入或稍后重试。";
    }
    if (error.message === "MISSING_GEMINI_API_KEY") {
      return "未配置 GEMINI_API_KEY。本地开发请在 .env.local 中设置；生产构建请在构建环境中注入该变量。";
    }
    const m = error.message;
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) {
      return "无法连接到 Google（网络失败）。若你所在网络访问 Google 受限，需可用国际网络/VPN；也可在开发者工具 Network 面板查看是否被拦截。";
    }
    return m;
  }

  return "发生未知错误。请打开浏览器开发者工具（Console）查看完整报错。";
}
