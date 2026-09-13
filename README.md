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
