import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CursorAdapter extends BaseAdapter {
	readonly outputFile = ".cursorrules";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".cursor/mcp.json";
	readonly skillDir = ".cursor/skills";
	readonly agentDir = ".cursor";
	readonly gitignoreOutputFile = true;
	readonly agentsFolderSupport: AgentsFolderSupport = "none";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
		"agents",
	];
}
