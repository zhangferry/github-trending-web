# OpenPulse · GitHub 开源趋势

公开浏览 GitHub 日／周／月榜，按语言筛选项目，查看仓库详情、最多五位贡献作者与原仓库链接。列表展示 Star 总量及增量、Fork 总量。无需账号登录。

## 本地运行

推荐 Node.js 24+。如访问 GitHub 需要系统代理，使用 `NODE_USE_ENV_PROXY=1` 让 Node 读取 HTTP(S)_PROXY。

```sh
npm ci
NODE_USE_ENV_PROXY=1 npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。生产验证使用 `npm run build` 和 `npm run start`。

## 项目解读

详情提供 README 节选和原文、版本、文档与示例入口。本地运行 Ollama 时还可点击「生成解读」：模型从公开资料整理用途、适用场景、上手方式和限制，输出带来源链接。

```sh
ollama pull qwen2.5:1.5b
```

本地服务使用 `127.0.0.1:11434`，默认模型为 `qwen2.5:1.5b`。可用 `OPENPULSE_AI_MODEL` 选择已安装的模型，设为空关闭 AI。Vercel 环境不调用本机模型，仍可浏览 README 与来源。可选的 `GITHUB_PUBLIC_TOKEN` 只用于读取公开仓库资料，请保留在服务端环境变量中。

## 数据与验证

首页使用 `/api/openpulse/*`，旧的 `/api/trending` 接口保持原样。实时趋势失败时优先使用相同时间和语言的快照，并显示来源与日期。运行快照保存在系统临时目录，不纳入版本管理。

```sh
node --test tests/openpulse-data.test.mjs tests/openpulse-summary.test.mjs
npm run build
```

若有 Playwright，可在运行服务后验证浏览器交互：

```sh
OPENPULSE_TEST_ORIGIN=http://localhost:3000 \
OPENPULSE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
node --test tests/openpulse-ui.test.mjs
```
