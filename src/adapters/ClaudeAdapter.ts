import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { AdapterCapabilities, AdapterConfig } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class ClaudeAdapter extends BaseAdapter {
	capabilities: AdapterCapabilities = {
		agentsFolderSupport: "none",
		unsupportedFeatures: ["agents", "mcp", "skills", "slash-commands"],
	};

	generate(config: AdapterConfig): void {
		const outputPath = path.join(config.targetPath, ".claude.json");

		let customInstructions =
			`${config.basePersona}\n\n${config.rulesContent}`.trim();

		if (config.slashCommands && config.slashCommands.length > 0) {
			customInstructions += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				customInstructions += `- /${cmd.name}: ${cmd.description}\n`;
			}
		}

		const claudeConfig = {
			customInstructions,
			mcpServers: config.mcpServers,
		};

		fs.mkdirSync(config.targetPath, { recursive: true });
		fs.writeFileSync(
			outputPath,
			JSON.stringify(claudeConfig, null, 2),
			"utf-8",
		);

		if (config.skills && config.skills.length > 0) {
			const skillsDir = path.join(config.targetPath, ".claude", "skills");
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
			this.updateGitignore(config.targetPath, path.join(".claude", "skills"));
		}

		this.updateGitignore(config.targetPath, ".claude.json");
		console.log(chalk.green(`✓ Generated Claude config at ${outputPath}`));
	}
}
