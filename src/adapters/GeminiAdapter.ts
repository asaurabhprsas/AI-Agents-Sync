import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class GeminiAdapter extends BaseAdapter {
	readonly outputFile = "AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".gemini/mcp.json";
	readonly skillDir = ".gemini/skills";
	readonly agentDir = ".gemini";
	readonly gitignoreOutputFile = false;
	readonly agentsFolderSupport: AgentsFolderSupport = "partial";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
