import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

/**
 * 创建 Playwright MCP 客户端（stdio 子进程）。用于深度抓取指定站点。
 * 若 PLAYWRIGHT_MCP_ENABLED=false 或拉取失败则返回 null。
 */
export async function createPlaywrightMcpClient() {
  if (process.env.PLAYWRIGHT_MCP_ENABLED === "false") return null;
  try {
    const transport = new Experimental_StdioMCPTransport({
      command: "npx",
      args: ["-y", "@executeautomation/playwright-mcp-server"],
    });
    const client = await createMCPClient({ transport });
    return client;
  } catch (err) {
    console.error("[playwright-mcp] createClient failed:", err);
    return null;
  }
}

type ToolSet = Record<string, import("ai").Tool>;

/**
 * 获取 Playwright MCP 工具（navigate、snapshot 等），供 AI SDK generateText 使用。
 * 调用方需在完成后执行 client.close()。
 */
export async function getPlaywrightMcpTools(): Promise<{
  tools: ToolSet;
  client: { close(): Promise<void> } | null;
}> {
  const client = await createPlaywrightMcpClient();
  if (!client) return { tools: {}, client: null };
  try {
    const tools = (await client.tools()) as ToolSet;
    return { tools, client };
  } catch (err) {
    console.error("[playwright-mcp] getTools failed:", err);
    await client.close().catch(() => {});
    return { tools: {}, client: null };
  }
}
