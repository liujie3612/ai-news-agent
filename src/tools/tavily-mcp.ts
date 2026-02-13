import { createMCPClient } from "@ai-sdk/mcp";

const TAVILY_MCP_URL = "https://mcp.tavily.com/mcp/";

export type TavilyMcpClient = Awaited<ReturnType<typeof createTavilyMcpClient>>;

/**
 * 创建 Tavily MCP 客户端（HTTP）。优先用于搜索 AI 新闻。
 * 未配置 TAVILY_API_KEY 时返回 null。
 */
export async function createTavilyMcpClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey?.trim()) return null;
  const url = `${TAVILY_MCP_URL}?tavilyApiKey=${encodeURIComponent(apiKey)}`;
  const client = await createMCPClient({
    transport: { type: "http" as const, url },
  });
  return client;
}

type ToolSet = Record<string, import("ai").Tool>;

/**
 * 获取 Tavily MCP 工具（搜索、提取等），供 AI SDK generateText 使用。
 * 调用方需在完成后执行 client.close()。
 */
export async function getTavilyMcpTools(): Promise<{
  tools: ToolSet;
  client: { close(): Promise<void> } | null;
}> {
  const client = await createTavilyMcpClient();
  if (!client) return { tools: {}, client: null };
  const tools = (await client.tools()) as ToolSet;
  return { tools, client };
}
