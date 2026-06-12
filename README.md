# 智能食材膳食规划器

根据手头食材自动分餐、估算热量，并提供营养分析与菜谱推荐。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 在线访问

部署后地址：https://jamiezhao446.github.io/smart-meal-planner/

## 膳食助手（LLM Agent）

架构：**前端 GitHub Pages + 后端 Vercel Serverless API**。LLM 负责理解自然语言，热量/营养数字由服务端工具精确计算。

### 本地开发（LLM 模式）

```bash
# 终端 1：启动 Agent API
cp .env.example .env   # 填入 OPENAI_API_KEY
npm run dev:agent

# 终端 2：启动前端（通过 Vite 代理 /api/agent）
echo 'VITE_AGENT_API_URL=/api/agent' >> .env
npm run dev
```

### 部署后端 API（Vercel）

1. 在 [vercel.com](https://vercel.com) 导入本仓库
2. **Framework Preset** 选 Other；根目录保持默认
3. 在 Environment Variables 添加：
   - `OPENAI_API_KEY`（必填）
   - `OPENAI_BASE_URL`（可选，兼容 OpenAI 协议的国内接口）
   - `OPENAI_MODEL`（默认 `gpt-4o-mini`）
4. 部署后得到 URL，例如 `https://xxx.vercel.app/api/agent`

### 连接前端

在 GitHub 仓库 **Settings → Secrets → Actions** 添加：

- `VITE_AGENT_API_URL` = `https://xxx.vercel.app/api/agent`

推送 `main` 后 Pages 会自动重新构建并启用 LLM 模式。未配置时助手自动降级为本地规则模式。
