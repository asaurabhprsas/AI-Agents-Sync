import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class KiloCodeAdapter extends BaseAdapter {
	readonly outputFile = "AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".kilocode/mcp.json";
	readonly skillDir = ".kilocode/skills";
	readonly agentDir = ".kilocode";
	readonly gitignoreOutputFile = false;
	readonly agentsFolderSupport: AgentsFolderSupport = "full";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
