import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
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
		default:
			return null;
	}
}

export async function applyCommand(agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	const basePersonaPath = path.join(syncDir, config.globalSettings);
	const basePersona = fs.existsSync(basePersonaPath)
		? fs.readFileSync(basePersonaPath, "utf-8")
		: "";

	const rawMcpContent = fs.existsSync(path.join(syncDir, "mcp.json"))
		? fs.readFileSync(path.join(syncDir, "mcp.json"), "utf-8")
		: '{"mcpServers":{}}';

	const injectedMcpContent = injectEnvVars(rawMcpContent);
	const fullMcpConfig = JSON.parse(injectedMcpContent);

	const processTarget = (targetDef: any, targetPath: string) => {
		for (const [agentName, agentConfig] of Object.entries(targetDef)) {
			if (agents.length > 0 && !agents.includes(agentName)) continue;

			const adapter = getAdapter(agentName);
			if (!adapter) {
				console.warn(
					chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`),
				);
				continue;
			}

			const rulesConfig = agentConfig as {
				rules: string[];
				mcpServers: string[];
			};
			let rulesContent = "";
			for (const ruleFile of rulesConfig.rules) {
				const rulePath = path.join(syncDir, "rules", ruleFile);
				if (fs.existsSync(rulePath)) {
					rulesContent += `${fs.readFileSync(rulePath, "utf-8")}\n\n`;
				} else {
					console.warn(
						chalk.yellow(`Warning: Rule file ${ruleFile} not found.`),
					);
				}
			}

			const filteredMcps: Record<string, any> = {};
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
			});
		}
	};

	console.log(chalk.blue("Processing root targets..."));
	processTarget(config.root, cwd);

	console.log(chalk.blue("Processing workspace targets..."));
	for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
		processTarget(wsDef, path.join(cwd, wsPath));
	}

	console.log(chalk.green("✓ Sync complete!"));
}
