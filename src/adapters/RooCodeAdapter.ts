import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class RooCodeAdapter extends BaseAdapter {
	readonly outputFile = ".roo/AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".roo/mcp.json";
	readonly skillDir = ".roo/skills";
	readonly agentDir = ".roo";
	readonly gitignoreOutputFile = true;
	readonly agentsFolderSupport: AgentsFolderSupport = "full";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
