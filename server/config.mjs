// OAuth 与开放平台凭证（黑客松联调用，硬编码便于独立部署）
// 安全提示：生产环境应改用环境变量或 Secret 管理，不要提交到公开仓库。

export const oauthConfig = {
  // 知乎开放平台分配的应用 ID
  appId: '200',
  // 应用密钥 —— 部署前替换为真实值（当前为占位符）
  appKey: 'c114xxxxc72',
  // 开放平台 Access Secret，用于调用用户数据接口（收藏、关注等）
  accessSecret: 'a18a00072a82d5f146b98457dd3412f6224b8365',
  // OAuth 回调地址，需与知乎开放平台登记值完全一致。
  // 留空时由后端根据请求域名动态拼接为 ${origin}/api/auth/callback。
  redirectUri: process.env.ZHIHU_REDIRECT_URI || '',
  // 知乎开放平台域名
  authorizeUrl: 'https://openapi.zhihu.com/authorize',
  tokenUrl: 'https://openapi.zhihu.com/access_token',
  profileUrl: 'https://openapi.zhihu.com/user',
  userApiBase: 'https://developer.zhihu.com',
}

// 服务端口
export const serverPort = Number(process.env.PORT) || 4173
