import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CursorAdapter extends BaseAdapter {
	readonly outputFile = ".cursorrules";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = ""; // unused for text format
	readonly mcpKey = "mcpServers";
	readonly mcpFile = null; // Cursor does not support MCP
	readonly skillDir = ".cursor/skills";
	readonly agentsFolderSupport: AgentsFolderSupport = "none";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
		"agents",
		"mcp",
	];
}
