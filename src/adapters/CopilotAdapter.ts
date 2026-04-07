// src/adapters/CopilotAdapter.ts
import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CopilotAdapter extends BaseAdapter {
	readonly outputFile = "AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = null;
	readonly skillDir = ".github/skills";
	readonly agentDir = ".github";
	readonly gitignoreOutputFile = false;
	readonly agentsFolderSupport: AgentsFolderSupport = "none";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
		"agents",
		"mcp",
	];
}
