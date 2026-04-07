import path from "node:path";
import chalk from "chalk";
import { config } from "dotenv";

// Load .env.agents from .ai-agents-sync directory
config({ path: path.resolve(process.cwd(), ".ai-agents-sync/.env.agents") });

export function injectEnvVars(content: string): string {
	return content.replace(/\$\{([A-Z0-9_]+)\}/g, (match, varName) => {
		const value = process.env[varName];
		if (value !== undefined) {
			return value;
		}
		console.warn(
			chalk.yellow(
				`Warning: Environment variable ${varName} not found in .ai-agents-sync/.env.agents or process.env`,
			),
		);
		return match;
	});
}
