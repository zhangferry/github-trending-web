// /api/openpulse/[action] · Cloudflare Pages Function
import { validRepository, createDataService } from "./data.js";

const service = createDataService({});

export const onRequest = async context => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const action = params.action;
  const query = url.searchParams;
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
  const data = service;
  try {
    if (request.method === "GET") {
      if (action === "trending") return json(await data.trending({
        since: query.get("since"), language: query.get("language"),
      }));
      if (action === "repository") {
        const name = query.get("repository");
        if (!name || !validRepository(name)) return json({ error: "无效的仓库标识。" }, 400);
        return json({ ...await data.detail(name, env.GITHUB_PUBLIC_TOKEN), aiAvailable: false });
      }
      if (action === "contributors") {
        const names = [...new Set((query.get("repositories") || "").split(","))].filter(validRepository).slice(0, 25);
        const result = {};
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(3, names.length) }, async () => {
          while (cursor < names.length) {
            const name = names[cursor++];
            try { result[name] = { contributors: await data.contributors(name), ranked: true }; }
            catch { result[name] = { unavailable: true }; }
          }
        }));
        return json(result);
      }
      return json({ error: "Not found" }, 404);
    }
    if (request.method === "POST") {
      if (action !== "summary") return json({ error: "Not found" }, 404);
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return json({ error: "请求来源不匹配。" }, 403);
      const name = query.get("repository");
      if (!name || !validRepository(name)) return json({ error: "无效的仓库标识。" }, 400);
      return json({ status: "disabled" });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return json({ error: "仓库不存在或不是公开仓库。" }, 404);
    }
    return json({ error: "GitHub 数据暂时不可用，请稍后重试。" }, 503);
  }
};
