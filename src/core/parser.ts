import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import chalk from "chalk";
import { type SyncConfig, SyncConfigSchema } from "../types/schema.js";

export async function loadConfig(cwd: string): Promise<SyncConfig> {
	const configPath = path.join(cwd, ".ai-agents-sync", "sync.config.ts");
	const compiledConfigPath = path.join(
		cwd,
		".ai-agents-sync",
		"sync.config.js",
	);

	if (!fs.existsSync(configPath) && !fs.existsSync(compiledConfigPath)) {
		console.error(
			chalk.red(
				`Error: Config file not found at ${configPath} or ${compiledConfigPath}`,
			),
		);
		process.exit(1);
	}

	const targetPath = fs.existsSync(compiledConfigPath)
		? compiledConfigPath
		: configPath;

	try {
		const module = await import(pathToFileURL(targetPath).href);
		const rawConfig = module.default || module.config;

		if (!rawConfig) {
			throw new Error(
				'Config file must export a default object or a named "config" object.',
			);
		}

		const parsed = SyncConfigSchema.parse(rawConfig);
		return parsed;
	} catch (error) {
		console.error(chalk.red("Failed to load or validate sync.config"));
		console.error(error);
		process.exit(1);
	}
}
