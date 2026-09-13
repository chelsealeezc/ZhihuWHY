# 知乎·讨论图谱（ZhihuWHY）

黑客松演示产品框架：把长内容拆成「讨论瞬间」，连接相关内容，并通过轻量投票进入讨论空间。

## 本地运行

```bash
npm install
npm run dev
```

## 页面与路由

| 路径 | 说明 |
|------|------|
| `/` | Intro 落地页 |
| `/picker` | MOCK 收藏选择（知乎蓝 + 列表；后续接真实收藏 API） |
| `/read/:articleId` | 阅读页 + 右侧讨论瞬间 / 投票 |
| `/space/:momentId` | 讨论空间（投票后 `window.open` 新标签页） |

本期阅读/讨论瞬间仍用 MOCK；登录与收藏将接入开放平台 OAuth（需小后端）。

## 构建

```bash
npm run build
npm run preview
```

生产环境 `base` 为 `/ZhihuWHY/`，适配 GitHub Pages 项目站点。

## 在线预览（GitHub Pages / github.io）

**https://chelsealeezc.github.io/ZhihuWHY/**

源码只在 `main`。推送到 `main` 后，GitHub Actions 会自动构建并部署；**不需要**再维护 `gh-pages` 分支。

Pages 设置里 Source 请选 **GitHub Actions**（不要选 Deploy from a branch）。

## 后端部署（登录 / 收藏）

真实知乎登录与收藏读取需要小后端（OAuth 换 Token、会话、调开放平台）。推荐：

1. **Vercel（首选，免费额度够用）**：Serverless API Routes + 环境变量存 Secret；回调形如 `https://<project>.vercel.app/api/auth/callback`
2. **备选**：Cloudflare Workers / Pages Functions；Sealos（赛事文档常提）

前端可继续放 GitHub Pages，或前后端一起放 Vercel。密钥只进平台 Environment Variables，不进 Git。

官方 Skill：`.codex/skills/zhihu`（`0.7.2-beta.20260911131715`）。
