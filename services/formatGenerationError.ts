import { SERVER_CHAT_MODEL_LABEL } from "../constants";

/**
 * 将运行时错误转换为用户可见中文说明；完整错误仍在 App 中 console.error。
 */
export function formatGenerationError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "模型返回内容无法解析为 JSON。可尝试缩短或改写输入后重试。";
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "请求超时。请稍后重试或缩短输入。";
    }

    const m = error.message;

    switch (m) {
      case "MISSING_MESSAGE":
        return "请输入内容后再提交。";
      case "INVALID_MODE":
        return "内部模式参数无效。请刷新页面后重试。";
      case "INVALID_JSON":
      case "BODY_TOO_LARGE":
        return "请求格式无效或体积过大。请刷新页面后重试。";
      case "SERVICE_MISCONFIGURED":
        return "服务端未正确配置密钥，请联系管理员。";
      case "UPSTREAM_TIMEOUT":
        return "上游生成超时（约 15 秒）。请稍后再试或缩短输入。";
      case "UPSTREAM_ERROR":
        return "上游模型服务暂时不可用。请稍后重试。";
      case "UPSTREAM_NETWORK":
        return "服务端无法访问模型接口（网络/TLS/DNS 被拦截或不可用）。若本机运行 `vercel dev`，请确认当前环境能访问 Google API（例如可用国际网络/VPN），并查看终端里 `[chat] … network …` 一行中的 cause 详情。";
      case "EMPTY_MODEL_REPLY":
        return "模型未返回正文（可能被安全策略拦截或候选为空）。请换一句输入或稍后重试。";
      case "METHOD_NOT_ALLOWED":
        return "请求方法不被允许。请刷新页面后重试。";
    }

    if (m.startsWith("HTTP_")) {
      const status = parseInt(m.slice(5), 10);
      if (status === 503) {
        return "服务暂时不可用。请稍后重试。";
      }
      if (status === 504) {
        return "上游生成超时。请稍后重试。";
      }
      if (status === 502) {
        return "上游服务错误。请稍后重试。";
      }
      if (status === 400) {
        return "请求被拒绝（400）。请检查输入。";
      }
      if (status === 405) {
        return "请求方法错误。请刷新页面后重试。";
      }
      return `请求失败（${Number.isFinite(status) ? status : m}）。当前模型：${SERVER_CHAT_MODEL_LABEL}。`;
    }

    if (error.message === "No response from AI") {
      return "模型未返回正文（可能被安全策略拦截或候选为空）。请换一句输入或稍后重试。";
    }

    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) {
      return "无法连接 API（网络失败）。本地开发可运行 `vercel dev` 以同时提供前端与 /api；若使用 `vite` 单独启动，请在 vite 中配置将 /api 代理到 `vercel dev` 端口，或改用 `vercel dev`。";
    }

    return m;
  }

  return "发生未知错误。请打开浏览器开发者工具（Console）查看完整报错。";
}
