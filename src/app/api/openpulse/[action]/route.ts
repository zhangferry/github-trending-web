import { NextRequest, NextResponse } from "next/server";
import { validRepository } from "@/server/openpulse-data.mjs";
import { data, summaries } from "@/server/openpulse.mjs";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, { params }: Context) {
  const { action } = await params;
  const query = request.nextUrl.searchParams;
  try {
    if (action === "trending") return json(await data.trending({
      since: query.get("since"), language: query.get("language"),
    }));
    if (action === "repository") {
      const name = query.get("repository");
      if (!name || !validRepository(name)) return json({ error: "无效的仓库标识。" }, 400);
      return json({ ...await data.detail(name, process.env.GITHUB_PUBLIC_TOKEN), aiAvailable: summaries.enabled });
    }
    if (action === "contributors") {
      const names = [...new Set((query.get("repositories") || "").split(","))].filter(validRepository).slice(0, 25);
      const result: Record<string, unknown> = {};
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
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404)
      return json({ error: "仓库不存在或不是公开仓库。" }, 404);
    return json({ error: "GitHub 数据暂时不可用，请稍后重试。" }, 503);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  if ((await params).action !== "summary") return json({ error: "Not found" }, 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ error: "请求来源不匹配。" }, 403);
  const name = request.nextUrl.searchParams.get("repository");
  if (!name || !validRepository(name)) return json({ error: "无效的仓库标识。" }, 400);
  if (!summaries.enabled) return json({ status: "disabled" });
  try { return json(await summaries.summarize(await data.detail(name, process.env.GITHUB_PUBLIC_TOKEN))); }
  catch { return json({ status: "unavailable" }); }
}
