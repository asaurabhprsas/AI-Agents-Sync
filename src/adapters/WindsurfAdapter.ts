import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class WindsurfAdapter extends BaseAdapter {
	readonly outputFile = "AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".windsurf/mcp.json";
	readonly skillDir = ".windsurf/skills";
	readonly agentDir = ".windsurf";
	readonly gitignoreOutputFile = false;
	readonly agentsFolderSupport: AgentsFolderSupport = "partial";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
