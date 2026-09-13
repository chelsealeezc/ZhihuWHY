import { loadEnvFile } from 'node:process'

try {
  loadEnvFile()
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

// OAuth 与开放平台凭证只从服务端环境变量读取。
// 不要将 App Key、Access Secret 或 OAuth Token 写入源码、日志或前端响应。

export const oauthConfig = {
  // 知乎开放平台分配的应用 ID
  appId: process.env.ZHIHU_OAUTH_APP_ID || '',
  // 应用密钥，仅保存在本地 .env 或部署平台 Secret 中
  appKey: process.env.ZHIHU_OAUTH_APP_KEY || '',
  // 开放平台 Access Secret，用于调用用户数据接口（收藏、关注等）
  accessSecret: process.env.ZHIHU_ACCESS_SECRET || '',
  // OAuth 回调地址，需与知乎开放平台登记值完全一致。
  // 留空时由后端根据请求域名动态拼接为 ${origin}/api/auth/callback。
  redirectUri: process.env.ZHIHU_OAUTH_REDIRECT_URI || '',
  // 知乎开放平台域名
  authorizeUrl: 'https://openapi.zhihu.com/authorize',
  tokenUrl: 'https://openapi.zhihu.com/access_token',
  profileUrl: 'https://openapi.zhihu.com/user',
  userApiBase: 'https://developer.zhihu.com',
}

export const aiConfig = {
  apiKey: process.env.OPENAI_NEXT_API_KEY || '',
  baseUrl: (process.env.OPENAI_NEXT_BASE_URL || 'https://api.openai-next.com/v1').replace(/\/$/, ''),
  model: process.env.OPENAI_NEXT_MODEL || 'gpt-5.6-sol',
}

// 服务端口
export const serverPort = Number(process.env.PORT) || 4173
