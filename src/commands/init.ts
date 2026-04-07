import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { askInitConfig } from "../core/interactive.js";

export async function initCommand(options: { update?: boolean } = {}) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");
	const configPath = path.join(syncDir, "sync.config.json");

	const configExists = fs.existsSync(configPath);

	if (!options.update && configExists) {
		const existingConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

		const useExisting = await p.confirm({
			message: "Config already exists. Use existing configuration?",
			initialValue: true,
		});

		if (p.isCancel(useExisting)) {
			p.cancel("Operation cancelled.");
			process.exit(0);
		}

		if (useExisting) {
			console.log(chalk.green("✓ Using existing configuration."));
			return;
		}

		const backupPath = path.join(
			syncDir,
			`sync.config.backup.${Date.now()}.json`,
		);
		fs.copyFileSync(configPath, backupPath);
		console.log(
			chalk.yellow(
				`✓ Backed up existing config to ${path.basename(backupPath)}`,
			),
		);

		const answers = await askInitConfig(existingConfig);

		if (answers.agents && answers.agents.length > 0) {
			const oldRoot = existingConfig.root || {};
			existingConfig.root = {};
			for (const agent of answers.agents) {
				existingConfig.root[agent] = oldRoot[agent] || {
					rules: ["default-rules.md"],
				};
			}
		}
		existingConfig.mergeCommonWithMain = answers.mergeCommon;

		fs.writeFileSync(
			configPath,
			JSON.stringify(existingConfig, null, 2),
			"utf-8",
		);
		console.log(chalk.green("✓ Configuration updated."));
		return;
	}

	if (!configExists) {
		fs.mkdirSync(syncDir, { recursive: true });
		fs.mkdirSync(path.join(syncDir, "agents-md"), { recursive: true });
		fs.mkdirSync(path.join(syncDir, "skills"), { recursive: true });
		fs.mkdirSync(path.join(syncDir, "slash-commands"), { recursive: true });
	}

	const envAgentPath = path.join(cwd, ".env.agent");
	if (!fs.existsSync(envAgentPath)) {
		fs.writeFileSync(
			envAgentPath,
			"# Add your agent secrets here\n# GITHUB_TOKEN=\n",
			"utf-8",
		);
	}

	const answers = await askInitConfig();

	fs.writeFileSync(
		path.join(syncDir, "agents-md", "main-agents.md"),
		"# Root Persona\nYou are an expert developer.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "agents-md", "common-agents.md"),
		"# Common Rules\n- Use ESM.\n- Use TypeScript.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "agents-md", "default-rules.md"),
		"- Write clean code.\n- Add tests.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "mcp.json"),
		'{\n  "mcpServers": {}\n}\n',
		"utf-8",
	);

	const rootConfig: Record<string, { rules: string[] }> = {};
	if (answers.agents && answers.agents.length > 0) {
		for (const agent of answers.agents) {
			rootConfig[agent] = { rules: ["default-rules.md"] };
		}
	}

	const config = {
		mergeCommonWithMain: answers.mergeCommon,
		root: rootConfig,
		workspaces: {},
	};

	fs.writeFileSync(
		path.join(syncDir, "sync.config.json"),
		JSON.stringify(config, null, 2),
		"utf-8",
	);

	const gitignorePath = path.join(cwd, ".gitignore");
	if (fs.existsSync(gitignorePath)) {
		const gitignore = fs.readFileSync(gitignorePath, "utf-8");
		if (!gitignore.includes(".env.agent")) {
			fs.appendFileSync(gitignorePath, "\n.env.agent\n", "utf-8");
		}
		if (!gitignore.includes(".ai-agents-sync")) {
			fs.appendFileSync(gitignorePath, "\n.ai-agents-sync\n", "utf-8");
		}
	} else {
		fs.writeFileSync(gitignorePath, ".env.agent\n.ai-agents-sync\n", "utf-8");
	}

	console.log(
		chalk.green("✓ Initialized .ai-agents-sync directory structure."),
	);
}
