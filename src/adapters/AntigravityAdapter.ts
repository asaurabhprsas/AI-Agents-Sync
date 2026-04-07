// src/adapters/AntigravityAdapter.ts
import type {
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class AntigravityAdapter extends BaseAdapter {
	readonly outputFile = ".gemini/antigravity/AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = ".gemini/antigravity/mcp.json";
	readonly skillDir = ".gemini/antigravity/skills";
	readonly agentDir = ".gemini";
	readonly gitignoreOutputFile = true;
	readonly agentsFolderSupport: AgentsFolderSupport = "partial";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
