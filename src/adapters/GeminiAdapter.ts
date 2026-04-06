import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { AdapterConfig, AdapterCapabilities } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class GeminiAdapter extends BaseAdapter {
	capabilities: AdapterCapabilities = {
		agentsFolderSupport: "partial",
		unsupportedFeatures: ["mcp"],
	};

	generate(config: AdapterConfig): void {
		const agentsDir = path.join(config.targetPath, ".agents");
		this.ensureDir(agentsDir);

		let customInstructions =
			`${config.basePersona}\n\n${config.rulesContent}`.trim();

		if (config.slashCommands && config.slashCommands.length > 0) {
			customInstructions += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				customInstructions += `- /${cmd.name}: ${cmd.description}\n`;
			}
		}

		fs.writeFileSync(
			path.join(agentsDir, "AGENTS.md"),
			customInstructions,
			"utf-8",
		);

		if (config.skills && config.skills.length > 0) {
			const skillsDir = path.join(agentsDir, "skills");
			this.ensureDir(skillsDir);

			for (const skill of config.skills) {
				const destDir = path.join(skillsDir, skill.name);
				this.ensureDir(destDir);

				const skillFiles = fs.readdirSync(skill.path);
				for (const file of skillFiles) {
					const srcFile = path.join(skill.path, file);
					const destFile = path.join(destDir, file);
					fs.copyFileSync(srcFile, destFile);
				}
			}
		}

		if (Object.keys(config.mcpServers).length > 0) {
			const mcpPath = path.join(config.targetPath, "mcp.json");
			fs.writeFileSync(
				mcpPath,
				JSON.stringify({ mcpServers: config.mcpServers }, null, 2),
				"utf-8",
			);
			this.updateGitignore(config.targetPath, "mcp.json");
		}

		this.updateGitignore(config.targetPath, ".agents");
		console.log(chalk.green(`✓ Generated Gemini config at ${config.targetPath}`));
	}
}
