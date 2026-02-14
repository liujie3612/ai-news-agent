import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { generateText, stepCountIs } from "ai";
import { createQwen } from "qwen-ai-provider";
import { getTavilyMcpTools } from "../tools/tavily-mcp.js";
import { sendDingTalk } from "../tools/dingtalk.js";

/** 阿里云百炼国际站（新加坡等），Qwen Plus */
const qwen = createQwen({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/api/v1",
});

export const LAST_DAILY_NEWS_FILE = join(process.cwd(), "last-daily-news.md");

/**
 * 让模型输出结构化 JSON
 */
const DAILY_NEWS_SYSTEM = `
你是专业的 AI 行业日报编辑。

步骤：
1. 使用 Tavily 搜索“今日 AI 新闻”。
2. 选择 10-15 条真正重要的新闻。
3. 输出 JSON 数组格式：

[
  {
    "category": "产业与资本 | 模型与产品 | 公司动态 | 政策监管 | AI安全",
    "title": "新闻标题",
    "summary": "一句话摘要（不超过40字）",
    "url": "原文链接"
  }
]

规则：
- 不要输出 Markdown
- 不要解释
- 只输出 JSON
`;

const DAILY_NEWS_PROMPT = `
请采集今日 AI 领域重要新闻，并按指定 JSON 格式输出。
`;

function formatMarkdown(newsItems: any[]): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const groups: Record<string, any[]> = {};

  for (const item of newsItems) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }

  let md = `# 📰 AI 每日要闻\n${dateStr}\n\n---\n`;

  const categoryEmoji: Record<string, string> = {
    "产业与资本": "🚀",
    "模型与产品": "🧠",
    "公司动态": "🏢",
    "政策监管": "🏛",
    "AI安全": "🔐",
  };

  for (const category of Object.keys(groups)) {
    md += `\n## ${categoryEmoji[category] ?? "📌"} ${category}\n\n`;

    groups[category].forEach((item, index) => {
      md += `**${index + 1}. ${item.title}**\n`;
      md += `${item.summary}\n`;
      md += `🔗 [阅读原文](${item.url})\n\n`;
    });

    md += `---\n`;
  }

  return md;
}

export async function runDailyNewsJob(): Promise<void> {
  console.log("[1/3] 连接 Tavily...");
  const tavily = await getTavilyMcpTools();
  const tools = tavily.tools;

  if (!Object.keys(tools).length) {
    throw new Error("No Tavily tools available. Set TAVILY_API_KEY.");
  }

  try {
    console.log("[2/3] 正在生成日报...");

    const { text } = await generateText({
      model: qwen("qwen-plus") as unknown as Parameters<typeof generateText>[0]["model"],
      system: DAILY_NEWS_SYSTEM,
      prompt: DAILY_NEWS_PROMPT,
      tools,
      stopWhen: stepCountIs(15),
    });

    if (!text) {
      console.warn("No content generated.");
      return;
    }

    let newsItems: any[];

    try {
      let raw = text.trim();
      const codeBlock = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
      if (codeBlock) raw = codeBlock[1].trim();
      newsItems = JSON.parse(raw);
      if (!Array.isArray(newsItems) || newsItems.length === 0) {
        console.warn("模型未返回非空数组，跳过推送");
        return;
      }
    } catch (err) {
      console.error("模型未输出合法 JSON，原始内容前 500 字：", text.slice(0, 500));
      throw err;
    }

    const markdown = formatMarkdown(newsItems);

    await writeFile(LAST_DAILY_NEWS_FILE, markdown, "utf-8");

    console.log("\n--- 生成结果 ---\n");
    console.log(markdown);
    console.log("\n--- 结束 ---\n");

    console.log("[3/3] 推送钉钉...");

    await sendDingTalk({
      title: "AI 每日要闻",
      content: markdown,
      msgType: "markdown",
    });

    console.log("✅ 已推送钉钉");
  } finally {
    await tavily.client?.close().catch(() => {});
  }
}

async function main() {
  console.log("启动 AI 每日要闻任务...");

  // 部署环境自检：确认所需环境变量是否已注入（不打印具体值）
  const required = ["DASHSCOPE_API_KEY", "TAVILY_API_KEY", "DINGTALK_WEBHOOK_URL"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error("以下环境变量未设置或为空:", missing.join(", "));
    console.error("若在 Railway 已配置，请保存后点击 Deployments → 最新部署 → Redeploy 重新部署");
    process.exit(1);
  }

  try {
    await runDailyNewsJob();
  } catch (err) {
    console.error("任务失败:", err);
    process.exit(1);
  }
}

main();