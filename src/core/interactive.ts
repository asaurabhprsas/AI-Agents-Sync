import * as p from "@clack/prompts";
import type { SyncConfig } from "../types/schema.js";

export async function askAgentSelection(availableAgents: string[]) {
	const choice = await p.multiselect({
		message: "Select agents to sync:",
		options: availableAgents.map((a) => ({ value: a, label: a })),
	});
	if (p.isCancel(choice)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}
	return choice as string[];
}

export async function askInitConfig(existingConfig?: SyncConfig) {
	const group = await p.group(
		{
			agents: () =>
				p.multiselect({
					message: "Which agents are you using?",
					options: [
						{ value: "claude", label: "Claude Code" },
						{ value: "cursor", label: "Cursor" },
						{ value: "gemini", label: "Gemini CLI" },
						{ value: "roocode", label: "Roo Code" },
						{ value: "kilocode", label: "Kilo Code" },
						{ value: "windsurf", label: "Windsurf" },
						{ value: "opencode", label: "OpenCode" },
						{ value: "antigravity", label: "Google Antigravity" },
						{ value: "copilot", label: "GitHub Copilot" },
					],
					initialValues: existingConfig?.defaultAgents || [],
				}),
			mergeCommon: () =>
				p.confirm({
					message: "Merge common-agents.md with main-agents.md by default?",
					initialValue: existingConfig?.mergeCommonWithMain ?? false,
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);
	return group;
}
