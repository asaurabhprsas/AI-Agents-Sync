import { z } from "zod";

export const SlashCommandSchema = z.object({
	command: z.string(),
	description: z.string(),
});

export const AgentTargetSchema = z.object({
	rules: z.array(z.string()).optional().default([]),
	mcpServers: z.array(z.string()).optional().default([]),
	slashCommands: z.array(SlashCommandSchema).optional().default([]),
});

export const SyncConfigSchema = z.object({
	mergeCommonWithMain: z.boolean().optional().default(false),
	root: z.record(z.string(), AgentTargetSchema).optional().default({}),
	workspaces: z
		.record(z.string(), z.record(z.string(), AgentTargetSchema))
		.optional()
		.default({}),
});

export type SlashCommand = z.infer<typeof SlashCommandSchema>;
export type AgentTarget = z.infer<typeof AgentTargetSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export interface AdapterConfig {
	agentName: string;
	targetPath: string;
	basePersona: string;
	rulesContent: string;
	mcpServers: Record<string, unknown>;
	slashCommands: SlashCommand[];
}
