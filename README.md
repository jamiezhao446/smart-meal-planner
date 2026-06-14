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

### 部署到 Vercel（前端 + Agent API 一体）

1. 登录 [vercel.com](https://vercel.com) → **Add New… → Project**
2. **Import** GitHub 仓库 `smart-meal-planner`
3. Framework 会自动识别为 **Vite**，保持默认即可：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables** 添加：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `OPENAI_API_KEY` | `sk-...` | Agent API 必填 |
   | `VITE_AGENT_API_URL` | `/api/agent` | 同域调用，填相对路径即可 |
   | `OPENAI_BASE_URL` | （可选） | 如 `https://api.deepseek.com/v1` |
   | `OPENAI_MODEL` | （可选） | 如 `deepseek-chat` |

   > 不要设 `VITE_BASE`，Vercel 域名下用根路径 `/` 即可。

5. 点击 **Deploy**，完成后访问 `https://你的项目名.vercel.app`
6. 右下角 💬 助手应显示 **「LLM + 精确计算工具」**

### 仅部署 API（前端仍用 GitHub Pages）

若前端继续用 GitHub Pages，Vercel 项目可只跑 `api/`，并在 GitHub Secret 配置完整 API 地址：

- `VITE_AGENT_API_URL` = `https://xxx.vercel.app/api/agent`

