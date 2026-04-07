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
	/** Absolute path to .ai-agents-sync/skills/ — all subdirs are copied as skills */
	skillsSourceDir: string;
	/** Tracks files already written in this run to avoid duplicate writes */
	writtenFiles: Set<string>;
}

export type AgentsFolderSupport = "full" | "partial" | "none";

export interface AdapterCapabilities {
	agentsFolderSupport: AgentsFolderSupport;
	unsupportedFeatures: ("mcp" | "skills" | "slash-commands" | "agents")[];
}
