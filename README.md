# AI 每日新闻 Agent

使用 Vercel AI SDK + **Tavily MCP** 采集 AI 圈子每日新闻，**GLM-5** 摘要后推送到钉钉；支持 **Railway** 从 GitHub 推送部署并通过 Cron 每天 10 点执行。当前仅用 Tavily 做搜索，未接入 Playwright。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `ZHIPU_API_KEY`：智谱 API Key（GLM-5）
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
2. 执行 `pnpm run daily:send`，用该文件内容重新推送到钉钉（不再请求 Tavily/GLM-5）。

这样不用每次改格式都等一整轮抓取。

## 钉钉没收到消息时

- 终端若报错 `DingTalk 返回错误: errcode=xxx`，按 errcode 排查（如 310000 多为加签问题）。
- 群机器人若开启了**安全设置**：选「自定义关键词」时，消息里需包含你设的关键词（如「要闻」）；选「加签」时，需在 Webhook URL 后追加 `&timestamp=xxx&sign=xxx`，当前脚本未实现加签，可先在机器人里改用「关键词」或关闭安全设置做验证。

## Railway 部署（从 GitHub 推送）

1. 在 Railway 新建项目，关联本仓库。
2. 在项目 Settings 中配置 **Cron Schedule**：`0 2 * * *`（UTC 02:00 ≈ 北京时间 10:00）。
3. 配置环境变量：`ZHIPU_API_KEY`、`TAVILY_API_KEY`、`DINGTALK_WEBHOOK_URL`。
4. 启动命令保持为执行单次任务并退出（默认 `node dist/index.js` 或使用 `npm run daily`），确保 Cron 触发时跑完即退出。

## 项目结构

- `src/tools/tavily-mcp.ts`：Tavily MCP 客户端（HTTP）
- `src/tools/dingtalk.ts`：钉钉 Webhook 推送
- `src/jobs/daily-news.ts`：每日任务（Tavily → GLM-5 → 钉钉）
- `src/index.ts`：入口（供 Cron 调用）
- `src/tools/playwright-mcp.ts`：Playwright MCP（保留，当前未使用）

## 技术栈

- **Vercel AI SDK**（`ai`）+ **zhipu-ai-provider**（GLM-5）
- **@ai-sdk/mcp**：Tavily（HTTP）
- 钉钉：自建 Webhook POST
