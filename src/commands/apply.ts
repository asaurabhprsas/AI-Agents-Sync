import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
import { injectEnvVars } from "../core/env-injector.js";
import { loadConfig } from "../core/parser.js";

import type { AgentTarget, SyncConfig } from "../types/schema.js";

function getAdapter(agentName: string) {
	switch (agentName.toLowerCase()) {
		case "claude":
			return new ClaudeAdapter();
		case "cursor":
			return new CursorAdapter();
		case "gemini":
			return new GeminiAdapter();
		default:
			return null;
	}
}

export async function applyCommand(agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	let selectedAgents = agents;
	if (agents.length === 0) {
		const availableAgents = new Set<string>();
		for (const agent of Object.keys(config.root)) availableAgents.add(agent);
		for (const ws of Object.values(config.workspaces)) {
			for (const agent of Object.keys(ws)) availableAgents.add(agent);
		}

		if (availableAgents.size === 0) {
			console.log(chalk.yellow("No agents configured in sync.config.js"));
			return;
		}

		const choice = await p.multiselect({
			message: "Select agents to sync:",
			options: Array.from(availableAgents).map((a) => ({ value: a, label: a })),
		});

		if (p.isCancel(choice)) {
			p.cancel("Operation cancelled.");
			process.exit(0);
		}
		selectedAgents = choice as string[];
	}

	const commonAgentsPath = path.join(syncDir, "common-agents.md");
	const commonAgents = fs.existsSync(commonAgentsPath)
		? fs.readFileSync(commonAgentsPath, "utf-8")
		: "";

	const mainAgentsPath = path.join(syncDir, "main-agents.md");
	const mainAgents = fs.existsSync(mainAgentsPath)
		? fs.readFileSync(mainAgentsPath, "utf-8")
		: "";

	const rawMcpContent = fs.existsSync(path.join(syncDir, "mcp.json"))
		? fs.readFileSync(path.join(syncDir, "mcp.json"), "utf-8")
		: '{"mcpServers":{}}';

	const injectedMcpContent = injectEnvVars(rawMcpContent);
	const fullMcpConfig = JSON.parse(injectedMcpContent);

	const processTarget = (
		targetDef: Record<string, AgentTarget>,
		targetPath: string,
		basePersona: string,
	) => {
		for (const [agentName, agentConfig] of Object.entries(targetDef)) {
			if (selectedAgents.length > 0 && !selectedAgents.includes(agentName))
				continue;

			const adapter = getAdapter(agentName);
			if (!adapter) {
				console.warn(
					chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`),
				);
				continue;
			}

			const rulesConfig = agentConfig;
			let rulesContent = "";
			for (const ruleFile of rulesConfig.rules) {
				const rulePath = path.join(syncDir, "agents-instruction", ruleFile);
				if (fs.existsSync(rulePath)) {
					rulesContent += `${fs.readFileSync(rulePath, "utf-8")}\n\n`;
				} else {
					console.warn(
						chalk.yellow(`Warning: Rule file ${ruleFile} not found.`),
					);
				}
			}

			const filteredMcps: Record<string, unknown> = {};
			const allMcps = fullMcpConfig.mcpServers || {};
			for (const srv of rulesConfig.mcpServers) {
				if (allMcps[srv]) {
					filteredMcps[srv] = allMcps[srv];
				} else {
					console.warn(
						chalk.yellow(`Warning: MCP server ${srv} not found in mcp.json.`),
					);
				}
			}

			adapter.generate({
				agentName,
				targetPath,
				basePersona,
				rulesContent,
				mcpServers: filteredMcps,
				slashCommands: rulesConfig.slashCommands || [],
			});
		}
	};

	const rootPersona = config.mergeCommonWithMain
		? `${mainAgents}\n\n${commonAgents}`.trim()
		: mainAgents;

	console.log(chalk.blue("Processing root targets..."));
	processTarget(config.root, cwd, rootPersona);

	console.log(chalk.blue("Processing workspace targets..."));
	for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
		const wsName = path.basename(wsPath);
		const wsAgentFile = path.join(syncDir, `${wsName}-agents.md`);
		const wsPersona = fs.existsSync(wsAgentFile)
			? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
			: commonAgents;

		processTarget(wsDef, path.join(cwd, wsPath), wsPersona);
	}

	console.log(chalk.green("✓ Sync complete!"));
}
