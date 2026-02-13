/**
 * 用上次保存的 last-daily-news.md 内容推送到钉钉，不重新抓数据，方便调试格式。
 * 使用前先跑一次 pnpm run daily 生成 last-daily-news.md，或手动编辑该文件。
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendDingTalk } from "../tools/dingtalk.js";

const LAST_DAILY_NEWS_FILE = join(process.cwd(), "last-daily-news.md");

async function main() {
  if (!process.env.DINGTALK_WEBHOOK_URL) {
    console.error("DINGTALK_WEBHOOK_URL is not set.");
    process.exit(1);
  }

  let content: string;
  try {
    content = await readFile(LAST_DAILY_NEWS_FILE, "utf-8");
  } catch (e) {
    console.error("读取 last-daily-news.md 失败，请先执行一次 pnpm run daily 生成该文件。", e);
    process.exit(1);
  }

  content = content.trim();
  if (!content) {
    console.error("last-daily-news.md 为空。");
    process.exit(1);
  }

  console.log("将以下内容发送到钉钉:\n");
  console.log(content);
  console.log("\n--- 发送中 ---");

  await sendDingTalk({
    title: "AI 每日要闻",
    content,
    msgType: "markdown",
  });

  console.log("已推送到钉钉。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
