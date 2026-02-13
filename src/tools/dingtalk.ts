/**
 * 钉钉群机器人 Webhook 推送。UTF-8，每分钟最多 20 条。
 * @see https://open.dingtalk.com/document/orgapp/custom-robots-send-group-messages
 */
export type DingTalkMessageType = "text" | "markdown";

export interface SendDingTalkOptions {
  title?: string;
  content: string;
  msgType?: DingTalkMessageType;
}

export async function sendDingTalk(options: SendDingTalkOptions): Promise<void> {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
  if (!webhookUrl?.trim()) {
    throw new Error("DINGTALK_WEBHOOK_URL is not set");
  }
  const msgType = options.msgType ?? "markdown";
  const body =
    msgType === "markdown"
      ? {
          msgtype: "markdown",
          markdown: {
            title: options.title ?? "AI 每日要闻",
            text: options.content,
          },
        }
      : {
          msgtype: "text",
          text: { content: options.content },
        };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: { errcode?: number; errmsg?: string } = {};
  try {
    data = JSON.parse(text) as { errcode?: number; errmsg?: string };
  } catch {
    // 非 JSON 时用原文
  }

  if (!res.ok) {
    throw new Error(`DingTalk HTTP ${res.status}: ${data.errmsg ?? text}`);
  }
  if (data.errcode != null && data.errcode !== 0) {
    throw new Error(`DingTalk 返回错误: errcode=${data.errcode} errmsg=${data.errmsg ?? text}`);
  }
  console.log("钉钉响应:", data.errmsg ?? "ok");
}
