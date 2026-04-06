import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { AdapterConfig } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class ClaudeAdapter extends BaseAdapter {
	generate(config: AdapterConfig): void {
		const outputPath = path.join(config.targetPath, ".claude.json");

		let customInstructions =
			`${config.basePersona}\n\n${config.rulesContent}`.trim();

		if (config.slashCommands.length > 0) {
			customInstructions += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				customInstructions += `- /${cmd.command}: ${cmd.description}\n`;
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

		console.log(chalk.green(`✓ Generated Claude config at ${outputPath}`));
	}
}
