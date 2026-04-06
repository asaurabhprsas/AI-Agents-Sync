import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
import { injectEnvVars } from "../core/env-injector.js";
import { loadConfig } from "../core/parser.js";

import { askAgentSelection } from "../core/interactive.js";

import type { AgentTarget, SlashCommand } from "../types/schema.js";

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

function loadSlashCommands(syncDir: string): SlashCommand[] {
	const commandsDir = path.join(syncDir, "slash-commands");
	if (!fs.existsSync(commandsDir)) {
		return [];
	}

	const commands: SlashCommand[] = [];
	const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"));

	for (const file of files) {
		const filePath = path.join(commandsDir, file);
		const content = fs.readFileSync(filePath, "utf-8");
		const commandName = file.replace(".md", "");

		const descriptionMatch = content.match(/^#\s*(.+?)(?:\n|$)/);
		const description = descriptionMatch
			? descriptionMatch[1]
			: `/${commandName}`;

		commands.push({
			name: commandName,
			description: description.trim(),
			content: content,
		});
	}

	return commands;
}

function loadSkills(syncDir: string): { name: string; path: string }[] {
	const skillsDir = path.join(syncDir, "skills");
	if (!fs.existsSync(skillsDir)) {
		return [];
	}

	const skills: { name: string; path: string }[] = [];
	const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isDirectory()) {
			skills.push({
				name: entry.name,
				path: path.join(skillsDir, entry.name),
			});
		}
	}

	return skills;
}

export async function applyCommand(agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	const slashCommands = loadSlashCommands(syncDir);
	const skills = loadSkills(syncDir);

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

		selectedAgents = await askAgentSelection(Array.from(availableAgents));
	}

	const commonAgentsPath = path.join(syncDir, "agents-md", "common-agents.md");
	const commonAgents = fs.existsSync(commonAgentsPath)
		? fs.readFileSync(commonAgentsPath, "utf-8")
		: "";

	const mainAgentsPath = path.join(syncDir, "agents-md", "main-agents.md");
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
				slashCommands: slashCommands,
				skills: skills,
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
		const wsAgentFile = path.join(syncDir, "agents-md", `${wsName}-agents.md`);
		const wsPersona = fs.existsSync(wsAgentFile)
			? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
			: commonAgents;

		processTarget(wsDef, path.join(cwd, wsPath), wsPersona);
	}

	console.log(chalk.green("✓ Sync complete!"));
}
