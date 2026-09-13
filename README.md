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
| `/picker` | MOCK 收藏 / 点赞选择（知乎蓝 + 列表样式） |
| `/read/:articleId` | 阅读页 + 右侧讨论瞬间 / 投票 |
| `/space/:momentId` | 讨论空间（投票后 `window.open` 新标签页） |

本期不接真实 AI / OAuth，数据均在 `src/data/mock.js`。

## 构建

```bash
npm run build
npm run preview
```

生产环境 `base` 为 `/ZhihuWHY/`，适配 GitHub Pages 项目站点。

## 在线预览（GitHub Pages / github.io）

队友可直接打开（开启 Pages 后生效）：

**https://chelsealeezc.github.io/ZhihuWHY/**

### 什么是 github.io？

GitHub Pages 会把仓库里的静态网站托管到 `https://<用户名>.github.io/<仓库名>/`。  
本仓库已配置：每次推送 `main` 会构建并发布到 `gh-pages` 分支。

### 首次需要仓库管理员点一次（约 30 秒）

1. 打开 [Pages 设置](https://github.com/chelsealeezc/ZhihuWHY/settings/pages)
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. Branch 选 **`gh-pages`** / **`/ (root)`** → Save
4. 等 1～2 分钟，刷新上面的链接即可
