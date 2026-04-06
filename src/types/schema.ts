import { z } from "zod";

export const AgentTargetSchema = z.object({
	rules: z.array(z.string()).optional().default([]),
	mcpServers: z.array(z.string()).optional().default([]),
});

export const SyncConfigSchema = z.object({
	globalSettings: z.string().optional().default("AGENTS.md"),
	root: z.record(AgentTargetSchema).optional().default({}),
	workspaces: z.record(z.record(AgentTargetSchema)).optional().default({}),
});

export type AgentTarget = z.infer<typeof AgentTargetSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export interface AdapterConfig {
	agentName: string;
	targetPath: string;
	basePersona: string;
	rulesContent: string;
	mcpServers: Record<string, any>;
}
