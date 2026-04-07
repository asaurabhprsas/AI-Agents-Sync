import { z } from "zod";

export const AgentTargetSchema = z.object({
	rules: z.array(z.string()).optional().default([]),
});

export const SyncConfigSchema = z.object({
	mergeCommonWithMain: z.boolean().optional().default(false),
	root: z.record(z.string(), AgentTargetSchema).optional().default({}),
	workspaces: z
		.record(z.string(), z.record(z.string(), AgentTargetSchema))
		.optional()
		.default({}),
});

export type AgentTarget = z.infer<typeof AgentTargetSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export interface SlashCommand {
	name: string;
	description: string;
	content: string;
}

export interface AdapterConfig {
	agentName: string;
	targetPath: string;
	basePersona: string;
	rulesContent: string;
	mcpServers: Record<string, unknown>;
	slashCommands: SlashCommand[];
	skills: { name: string; path: string }[];
}

export type AgentsFolderSupport = "full" | "partial" | "none";

export interface AdapterCapabilities {
	agentsFolderSupport: AgentsFolderSupport;
	unsupportedFeatures: ("mcp" | "skills" | "slash-commands" | "agents")[];
	customNames?: {
		folder?: string; // e.g., ".kilocode"
		mcpFile?: string; // e.g., "mcp-config.json"
		mcpKey?: string; // e.g., "mcp"
		skillsFolder?: string;
		commandsFolder?: string;
	};
}
