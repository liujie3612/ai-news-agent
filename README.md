# AI 每日新闻 Agent

使用 Vercel AI SDK + **Tavily MCP** 采集 AI 圈子每日新闻，**Qwen Plus（阿里云百炼国际站）** 摘要后推送到钉钉；支持 **Railway** 从 GitHub 推送部署并通过 Cron 每天 10 点执行。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `DASHSCOPE_API_KEY`：阿里云百炼国际站 API Key（Qwen Plus，新加坡等节点）
- `TAVILY_API_KEY`：Tavily MCP（采新闻）
- `DINGTALK_WEBHOOK_URL`：钉钉群机器人 Webhook

## 本地运行

```bash
pnpm install
cp .env.example .env
# 编辑 .env 填入上述变量

# 执行一次每日任务（采新闻 + 推钉钉）
pnpm run daily
```

## 调试格式（不重新抓数据）

每次执行 `pnpm run daily` 会把**发送钉钉前**的正文写入项目根目录 `last-daily-news.md`。你可以：

1. 编辑 `last-daily-news.md` 调整排版或内容；
2. 执行 `pnpm run daily:send`，用该文件内容重新推送到钉钉（不再请求 Tavily/模型）。

这样不用每次改格式都等一整轮抓取。

## 钉钉没收到消息时

- 终端若报错 `DingTalk 返回错误: errcode=xxx`，按 errcode 排查（如 310000 多为加签问题）。
- 群机器人若开启了**安全设置**：选「自定义关键词」时，消息里需包含你设的关键词（如「要闻」）；选「加签」时，需在 Webhook URL 后追加 `&timestamp=xxx&sign=xxx`，当前脚本未实现加签，可先在机器人里改用「关键词」或关闭安全设置做验证。

## Railway 部署（从 GitHub 完整流程）

### 第一步：从 GitHub 导入

1. 登录 [Railway](https://railway.app)，点击 **New Project**。
2. 选 **Deploy from GitHub repo**，授权后选择你的 **ai-news-agent** 仓库。
3. Railway 会为仓库创建一个 Service，并开始第一次部署。

### 第二步：配置构建与启动

在 **ai-news-agent** 该 Service 里：

1. 打开 **Settings**，找到 **Build** 相关项（或 **Config-as-code** 若用配置文件）：
   - **Build Command**（若需自定义）：`pnpm install && pnpm run build`  
     （Railway 若已自动识别 pnpm，可只保留 `pnpm run build` 或留空用默认。）
   - **Output Directory**（若有）：留空即可，构建产物在项目根目录的 `dist/`。
2. **Start Command**（启动命令）设为：
   ```bash
   node dist/index.js
   ```
   或：`npm run start`（会执行 `node dist/index.js`）。

说明：本应用是「跑一次就退出」的 Cron 任务，不是常驻 Web 服务。部署后 Railway 可能会跑一次并显示 **Crashed**——若日志里是正常执行完（采新闻、推钉钉），那是**正常退出**，不是错误；真正报错会在 Logs 里看到堆栈。

### 第三步：配置环境变量（必做）

1. 在该 Service 里点 **Variables** 标签。
2. 点击 **+ New Variable** 或 **Add Variable**，逐个添加（名称与本地 `.env` 一致）：

   | 变量名 | 说明 |
   |--------|------|
   | `DASHSCOPE_API_KEY` | 阿里云百炼国际站 API Key（Qwen Plus） |
   | `TAVILY_API_KEY` | Tavily API Key |
   | `DINGTALK_WEBHOOK_URL` | 钉钉群机器人 Webhook 完整 URL |

3. 保存后，Railway 会用这些变量注入到 `process.env`，**不会**从 GitHub 读 `.env`（仓库里也不应提交 `.env`）。

### 第四步：配置每天 10 点执行（Cron）

1. 在同一 Service 的 **Settings** 里找到 **Cron Schedule**（或 Scheduler / Triggers，依 Railway 当前界面为准）。
2. 填写 cron 表达式：**`0 2 * * *`**
   - 含义：每天 UTC 02:00 执行一次 ≈ **北京时间 10:00**（UTC+8）。
3. 保存。到点后 Railway 会按你配置的 **Start Command** 启动一次 `node dist/index.js`，跑完即退出。

### 第五步：确认是否正常

- 点 **Deployments** 看每次部署状态；点 **Logs** 看当次运行的输出。
- 若某次是 Cron 触发：日志里应有 Tavily 连接、生成日报、推送钉钉等输出；进程退出后 Service 可能显示 Crashed，但若日志无报错且钉钉收到消息，即表示这次执行成功。
- 若部署后**立即** Crashed 且 Logs 里是 `DASHSCOPE_API_KEY` 未设置等：说明环境变量未生效，回到 **Variables** 检查名称是否与上表完全一致、是否已保存并重新部署。

## 项目结构

- `src/tools/tavily-mcp.ts`：Tavily MCP 客户端（HTTP）
- `src/tools/dingtalk.ts`：钉钉 Webhook 推送
- `src/jobs/daily-news.ts`：每日任务（Tavily → Qwen Plus → 钉钉）
- `src/index.ts`：入口（供 Cron 调用）
- `src/tools/playwright-mcp.ts`：Playwright MCP（保留，当前未使用）

## 技术栈

- **Vercel AI SDK**（`ai`）+ **qwen-ai-provider**（Qwen Plus，百炼国际站）
- **@ai-sdk/mcp**：Tavily（HTTP）
- 钉钉：自建 Webhook POST
