import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { AdapterConfig } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CursorAdapter extends BaseAdapter {
	generate(config: AdapterConfig): void {
		const outputPath = path.join(config.targetPath, ".cursorrules");

		let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();

		if (config.slashCommands.length > 0) {
			content += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				content += `- /${cmd.command}: ${cmd.description}\n`;
			}
		}

		fs.mkdirSync(config.targetPath, { recursive: true });
		fs.writeFileSync(outputPath, content, "utf-8");

		console.log(chalk.green(`✓ Generated Cursor config at ${outputPath}`));
	}
}
