import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class GeminiAdapter extends BaseAdapter {
	readonly outputFile = ".agents/AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = ""; // unused for text format
	readonly mcpKey = "mcpServers";
	readonly mcpFile = "mcp.json"; // separate file outside .agents/
	readonly skillDir = ".agents/skills";
	readonly agentsFolderSupport: AgentsFolderSupport = "partial";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
		"mcp",
	];
}
