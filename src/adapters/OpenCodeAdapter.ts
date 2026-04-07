import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type {
	AdapterCapabilities,
	AdapterConfig,
	AgentsFolderSupport,
} from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class OpenCodeAdapter extends BaseAdapter {
	readonly outputFile = "AGENTS.md";
	readonly outputFormat = "text" as const;
	readonly instructionsKey = "";
	readonly mcpKey = "mcp";
	readonly mcpFile = null;
	readonly skillDir = ".agents/skills";
	readonly agentDir = ".agents";
	readonly gitignoreOutputFile = true;
	readonly agentsFolderSupport: AgentsFolderSupport = "partial";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];

	override generate(config: AdapterConfig): void {
		const agentsDir = path.join(config.targetPath, ".agents");

		// 1. Write AGENTS.md (deduped)
		const agentsMdPath = path.join(config.targetPath, "AGENTS.md");
		if (!config.writtenFiles.has(agentsMdPath)) {
			config.writtenFiles.add(agentsMdPath);
			let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
			const includeSlash = config.includeSlashCommands !== false;
			if (
				includeSlash &&
				config.slashCommands &&
				config.slashCommands.length > 0
			) {
				content += "\n\nAvailable Slash Commands:\n";
				for (const cmd of config.slashCommands) {
					content += `- /${cmd.name}: ${cmd.description}\n`;
				}
			}
			fs.mkdirSync(path.dirname(agentsMdPath), { recursive: true });
			fs.writeFileSync(agentsMdPath, content, "utf-8");
		}

		// 2. Create .agents directory
		this.ensureDir(agentsDir);

		// 3. Copy slash-commands to .agents/commands/
		if (config.includeSlashCommands !== false && config.slashCommands) {
			const commandsDir = path.join(agentsDir, "commands");
			this.ensureDir(commandsDir);
			for (const cmd of config.slashCommands) {
				fs.writeFileSync(
					path.join(commandsDir, `${cmd.name}.md`),
					cmd.content,
					"utf-8",
				);
			}
		}

		// 4. Copy MCP config to .agents/mcp.json
		if (config.includeMcp !== false && config.mcpServers) {
			const mcpPath = path.join(agentsDir, "mcp.json");
			fs.writeFileSync(
				mcpPath,
				JSON.stringify({ mcpServers: config.mcpServers }, null, 2),
				"utf-8",
			);
		}

		// 5. Copy skills if enabled
		if (config.includeSkills !== false) {
			this.copySkills(config);
		}

		// 6. Merge MCP into opencode.json
		if (config.includeMcp !== false) {
			const opencodePath = path.join(config.targetPath, "opencode.json");
			let existing: Record<string, unknown> = {};
			if (fs.existsSync(opencodePath)) {
				existing = JSON.parse(fs.readFileSync(opencodePath, "utf-8") as string);
			}
			existing.mcp = config.mcpServers;
			fs.writeFileSync(
				opencodePath,
				JSON.stringify(existing, null, 2),
				"utf-8",
			);
		}

		console.log(
			chalk.green(
				`✓ Generated ${config.agentName} config at ${config.targetPath}`,
			),
		);
	}
}
