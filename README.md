# GitHub Trending

一个使用 Next.js 构建的 GitHub Trending 项目，用于展示 GitHub 上最热门的仓库和开发者。

## 功能特点

- 📊 展示 GitHub 热门仓库
- 👥 展示 GitHub 热门开发者
- 🔍 支持按语言筛选
- 📱 响应式设计，支持移动端
- 🌙 支持深色模式
- ⚡ 使用 Next.js App Router 构建
- 🎨 使用 Tailwind CSS 构建现代化 UI

## 技术栈

- [Next.js 14](https://nextjs.org/) - React 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [SWR](https://swr.vercel.app/) - 数据获取
- [Vercel](https://vercel.com) - 部署平台

## 开始使用

1. 克隆项目

```bash
git clone https://github.com/yourusername/github-trending.git
cd github-trending
```

2. 安装依赖

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. 运行开发服务器

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. 打开 [http://localhost:3000](http://localhost:3000) 查看结果

## 项目结构

```
github-trending/
├── app/                # Next.js App Router 目录
├── components/         # React 组件
├── lib/               # 工具函数和 API
├── public/            # 静态资源
└── styles/            # 全局样式
```

## 贡献指南

欢迎提交 Pull Request 或创建 Issue 来帮助改进项目。

## 许可证

MIT License
