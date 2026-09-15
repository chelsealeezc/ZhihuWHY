# 知乎 · 回响（Echo in Zhihu）

黑客松演示产品框架：把长内容拆成「讨论瞬间」，连接相关内容，并通过轻量投票进入讨论空间。

## 本地运行

```bash
npm install
npm run dev
```

需要联调知乎登录或收藏时，先复制 `.env.example` 为 `.env`，填写赛事页面分配的配置；真实凭证只能保存在本地 `.env` 或部署平台 Secret 中，不能提交到 Git。

```bash
cp .env.example .env
```

不登录也可调用的核心服务端接口：

- `POST /api/discussions/analyze`：输入文章标题与段落，通过配置的模型生成 3～6 个讨论瞬间。
- `GET /api/zhihu/search?query=...&count=10`：使用开放平台 Access Secret 搜索知乎真实内容。

AI Key 和知乎 Access Secret 都只配置在服务端；前端不得使用 `VITE_` 前缀暴露这些变量。

## 页面与路由

| 路径 | 说明 |
|------|------|
| `/` | Intro 落地页 |
| `/picker` | 登录后读取真实收藏；也可在「探索知乎」中直接搜索公开真实内容 |
| `/read/:articleId` | 阅读页 + AI 讨论瞬间 + 知乎相关内容 / 投票 |
| `/space/:momentId` | 讨论空间：承接投票、知乎真实表达与内嵌 AI 分身对话 |

收藏页会把用户选中的真实内容带入阅读页，并保留标题、作者、摘要、互动数据和知乎原文入口；未登录时也可通过「探索知乎」调用服务端搜索公开真实内容后导入。阅读页会优先调用服务端 AI 生成 3～6 个讨论瞬间，并按当前讨论检索知乎真实相关内容；AI 使用低推理强度并设置 30 秒上限，成功结果会在浏览器缓存 24 小时。服务端密钥尚未配置、超时或接口失败时自动回退到 MOCK，保证 Demo 主链路仍可演示。

讨论空间的「AI 分身」会默认基于答主过往公开表达简短表明立场，用户可以以「我」的身份在内嵌聊天框中连续回复。分身会结合过往表达和当前对话保持、说明或修正观点；所有回复均为观点推演，不代表本人实时发言。

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

## Vercel 完整 Demo

Vercel 同时部署 Vite 前端与根目录 `api/` 下的 Functions。导入 GitHub 仓库后，在 Vercel 项目设置中配置 `.env.example` 列出的服务端环境变量；`SESSION_SECRET` 至少使用 32 个随机字符。生产 OAuth 回调地址为：

```text
https://<你的-vercel-域名>/api/auth/callback
```

知乎部分 OAuth 环境不会在回调中返回 `state`。当前实现默认拒绝缺失 `state` 的回调；如果你已确认所用环境确实不返回 `state`，可在 Vercel 显式设置 `ZHIHU_OAUTH_ALLOW_MISSING_STATE=true`，兼容交换一次性授权码。

GitHub Pages 继续作为 Mock UI 预览；其 workflow 会单独设置 `/ZhihuWHY/` 基础路径，不影响 Vercel 根路径部署。

## 后端部署（登录 / 收藏）

真实知乎登录与收藏读取需要小后端（OAuth 换 Token、会话、调开放平台）。推荐：

1. **Vercel（首选，免费额度够用）**：Serverless API Routes + 环境变量存 Secret；回调形如 `https://<project>.vercel.app/api/auth/callback`
2. **备选**：Cloudflare Workers / Pages Functions；Sealos（赛事文档常提）

前端可继续放 GitHub Pages，或前后端一起放 Vercel。密钥只进平台 Environment Variables，不进 Git。

官方 Skill：`.codex/skills/zhihu`（`0.7.2-beta.20260911131715`）。
