import * as p from "@clack/prompts";

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

export async function askInitConfig(existingConfig?: any) {
	const group = await p.group(
		{
			agents: () =>
				p.multiselect({
					message: "Which agents are you using?",
					options: [
						{ value: "cursor", label: "Cursor" },
						{ value: "claude", label: "Claude" },
						{ value: "gemini", label: "Gemini" },
					],
					initialValues: existingConfig ? Object.keys(existingConfig.root) : [],
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
