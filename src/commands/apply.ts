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
import { loadConfig } from "../core/parser.js";

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

function writeWorkspaceAgentsMd(
	targetPath: string,
	basePersona: string,
	rulesContent: string,
	writtenFiles: Set<string>,
): void {
	const agentsMdPath = path.join(targetPath, "AGENTS.md");
	if (writtenFiles.has(agentsMdPath)) return;
	writtenFiles.add(agentsMdPath);

	const content = `${basePersona}\n\n${rulesContent}`.trim();
	fs.mkdirSync(path.dirname(agentsMdPath), { recursive: true });
	fs.writeFileSync(agentsMdPath, content, "utf-8");
}

export async function applyCommand(_agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	const defaultAgents = config.defaultAgents || [];

	if (defaultAgents.length === 0) {
		console.log(chalk.yellow("No agents configured in sync.config.js"));
		return;
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

	const rootPersona = config.mergeCommonWithMain
		? `${mainAgents}\n\n${commonAgents}`.trim()
		: mainAgents;

	const rootRules = config.root?.rules || ["default-rules.md"];
	const rootRulesContent = loadRulesContent(syncDir, rootRules);

	const writtenFiles = new Set<string>();

	console.log(chalk.blue("Processing root targets..."));
	for (const agentName of defaultAgents) {
		const adapter = getAdapter(agentName);

		if (!adapter) {
			console.warn(
				chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`),
			);
			continue;
		}

		adapter.generate({
			agentName,
			targetPath: cwd,
			basePersona: rootPersona,
			rulesContent: rootRulesContent,
			mcpServers: fullMcpConfig.mcpServers || {},
			slashCommands: [],
			skillsSourceDir: path.join(syncDir, "skills"),
			writtenFiles,
			includeSkills: true,
			includeMcp: true,
			includeSlashCommands: true,
		});
	}

	console.log(chalk.blue("Processing workspace targets..."));
	for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
		const wsName = path.basename(wsPath);
		const wsAgentFile = path.join(syncDir, "agents-md", `${wsName}-agents.md`);
		const wsPersona = fs.existsSync(wsAgentFile)
			? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
			: commonAgents;

		const wsRules = wsDef.rules || ["default-rules.md"];
		const wsRulesContent = loadRulesContent(syncDir, wsRules);

		const wsTargetPath = path.join(cwd, wsPath);
		writeWorkspaceAgentsMd(
			wsTargetPath,
			wsPersona,
			wsRulesContent,
			writtenFiles,
		);
	}

	console.log(chalk.green("✓ Sync complete!"));
}
