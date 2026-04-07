import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class ClaudeAdapter extends BaseAdapter {
	readonly outputFile = ".claude.json";
	readonly outputFormat = "json" as const;
	readonly instructionsKey = "customInstructions";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = null; // MCP embedded directly in .claude.json
	readonly skillDir = ".claude/skills";
	readonly agentsFolderSupport: AgentsFolderSupport = "none";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
		"agents",
	];
}
