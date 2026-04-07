import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { AntigravityAdapter } from "../adapters/AntigravityAdapter.js";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CopilotAdapter } from "../adapters/CopilotAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
import { KiloCodeAdapter } from "../adapters/KiloCodeAdapter.js";
import { OpenCodeAdapter } from "../adapters/OpenCodeAdapter.js";
import { RooCodeAdapter } from "../adapters/RooCodeAdapter.js";
import { WindsurfAdapter } from "../adapters/WindsurfAdapter.js";
import { injectEnvVars } from "../core/env-injector.js";
import { askAgentSelection } from "../core/interactive.js";
import { loadConfig } from "../core/parser.js";
import type { SlashCommand } from "../types/schema.js";

function getAdapter(agentName: string) {
	switch (agentName.toLowerCase()) {
		case "claude":
			return new ClaudeAdapter();
		case "cursor":
			return new CursorAdapter();
		case "gemini":
			return new GeminiAdapter();
		case "roocode":
			return new RooCodeAdapter();
		case "kilocode":
			return new KiloCodeAdapter();
		case "windsurf":
			return new WindsurfAdapter();
		case "opencode":
			return new OpenCodeAdapter();
		case "antigravity":
			return new AntigravityAdapter();
		case "copilot":
			return new CopilotAdapter();
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

function loadRulesContent(syncDir: string, rules: string[]): string {
	let rulesContent = "";
	for (const ruleFile of rules) {
		const rulePath = path.join(syncDir, "agents-md", ruleFile);
		if (fs.existsSync(rulePath)) {
			rulesContent += `${fs.readFileSync(rulePath, "utf-8")}\n\n`;
		} else {
			console.warn(chalk.yellow(`Warning: Rule file ${ruleFile} not found.`));
		}
	}
	return rulesContent;
}

export async function applyCommand(agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	const defaultAgents = config.defaultAgents || [];
	const slashCommands = loadSlashCommands(syncDir);
	const skillsSourceDir = path.join(syncDir, "skills");
	const writtenFiles = new Set<string>();

	let selectedAgents = agents;
	if (agents.length === 0) {
		if (defaultAgents.length === 0) {
			console.log(chalk.yellow("No agents configured in sync.config.js"));
			return;
		}
		selectedAgents = await askAgentSelection(defaultAgents);
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

	const generateForAgents = (
		agentList: string[],
		targetPath: string,
		basePersona: string,
		rules: string[],
		options: {
			includeSkills: boolean;
			includeMcp: boolean;
			includeSlashCommands: boolean;
		},
	) => {
		for (const agentName of agentList) {
			if (selectedAgents.length > 0 && !selectedAgents.includes(agentName))
				continue;

			const adapter = getAdapter(agentName);
			if (!adapter) {
				console.warn(
					chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`),
				);
				continue;
			}

			const rulesContent = loadRulesContent(syncDir, rules);
			const allMcps: Record<string, unknown> = fullMcpConfig.mcpServers || {};

			adapter.generate({
				agentName,
				targetPath,
				basePersona,
				rulesContent,
				mcpServers: allMcps,
				slashCommands: slashCommands,
				skillsSourceDir,
				writtenFiles,
				includeSkills: options.includeSkills,
				includeMcp: options.includeMcp,
				includeSlashCommands: options.includeSlashCommands,
			});
		}
	};

	const rootPersona = config.mergeCommonWithMain
		? `${mainAgents}\n\n${commonAgents}`.trim()
		: mainAgents;

	const rootRules = config.root?.rules || ["default-rules.md"];

	console.log(chalk.blue("Processing root targets..."));
	generateForAgents(defaultAgents, cwd, rootPersona, rootRules, {
		includeSkills: true,
		includeMcp: true,
		includeSlashCommands: true,
	});

	console.log(chalk.blue("Processing workspace targets..."));
	for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
		const wsName = path.basename(wsPath);
		const wsAgentFile = path.join(syncDir, "agents-md", `${wsName}-agents.md`);
		const wsPersona = fs.existsSync(wsAgentFile)
			? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
			: commonAgents;

		const wsRules = wsDef.rules || ["default-rules.md"];
		generateForAgents(
			defaultAgents,
			path.join(cwd, wsPath),
			wsPersona,
			wsRules,
			{
				includeSkills: false,
				includeMcp: false,
				includeSlashCommands: false,
			},
		);
	}

	console.log(chalk.green("✓ Sync complete!"));
}
