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
	const jsonConfigPath = path.join(cwd, ".ai-agents-sync", "sync.config.json");

	if (
		!fs.existsSync(configPath) &&
		!fs.existsSync(compiledConfigPath) &&
		!fs.existsSync(jsonConfigPath)
	) {
		console.error(
			chalk.red(
				`Error: Config file not found at ${configPath} or ${compiledConfigPath} or ${jsonConfigPath}`,
			),
		);
		process.exit(1);
	}

	let targetPath: string;
	if (fs.existsSync(jsonConfigPath)) {
		targetPath = jsonConfigPath;
	} else if (fs.existsSync(compiledConfigPath)) {
		targetPath = compiledConfigPath;
	} else {
		targetPath = configPath;
	}

	try {
		if (targetPath.endsWith(".json")) {
			const content = fs.readFileSync(targetPath, "utf-8");
			const rawConfig = JSON.parse(content);
			const parsed = SyncConfigSchema.parse(rawConfig);
			return parsed;
		}

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
