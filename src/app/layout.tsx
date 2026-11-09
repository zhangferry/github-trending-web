import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenPulse · 开源趋势",
  description: "发现 GitHub 热门开源项目，查看贡献作者、趋势和仓库解读。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
