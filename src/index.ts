/**
 * 入口：Railway Cron 可配置启动命令为 node dist/index.js 或 npm run daily。
 */
import "dotenv/config";
import { runDailyNewsJob } from "./jobs/daily-news.js";

runDailyNewsJob().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
