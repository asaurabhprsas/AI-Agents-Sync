import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { askInitConfig } from "../core/interactive.js";

function createDemoContent(syncDir: string) {
	fs.mkdirSync(path.join(syncDir, "skills", "demo-skill"), { recursive: true });
	fs.writeFileSync(
		path.join(syncDir, "skills", "demo-skill", "README.md"),
		"# Demo Skill\n\nThis is a sample skill for demonstration.\n",
		"utf-8",
	);

	fs.writeFileSync(
		path.join(syncDir, "slash-commands", "demo.md"),
		"# Demo Command\n\nThis is a sample slash command for demonstration.\n",
		"utf-8",
	);

	const mcpContent = JSON.stringify(
		{
			mcpServers: {
				"demo-command": {
					command: "npx",
					args: ["-y", "demo-package"],
				},
				"demo-remote": {
					url: "${DEMO_API_KEY_1}/api/mcp",
				},
			},
		},
		null,
		2,
	);
	fs.writeFileSync(path.join(syncDir, "mcp.json"), mcpContent + "\n", "utf-8");

	const envContent = `# Demo environment variables
DEMO_API_KEY_1=https://example-api-1.com
DEMO_API_KEY_2=example_key_2
`;
	fs.writeFileSync(path.join(syncDir, ".env.agents"), envContent, "utf-8");
}

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
			existingConfig.defaultAgents = answers.agents;
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

	const envAgentPath = path.join(syncDir, ".env.agents");
	if (!fs.existsSync(envAgentPath)) {
		fs.writeFileSync(
			envAgentPath,
			"# Add your agent secrets here\n# DEMO_API_KEY_1=\n# DEMO_API_KEY_2=\n",
			"utf-8",
		);
	}

	const answers = await askInitConfig();

	const addDemo = await p.confirm({
		message:
			"Would you like to add demo content (skills, MCP, slash-commands)?",
		initialValue: true,
	});

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

	const config = {
		mergeCommonWithMain: answers.mergeCommon,
		defaultAgents: answers.agents || [],
		root: { rules: ["default-rules.md"] },
		workspaces: {},
	};

	fs.writeFileSync(
		path.join(syncDir, "sync.config.json"),
		JSON.stringify(config, null, 2),
		"utf-8",
	);

	if (addDemo) {
		createDemoContent(syncDir);
	}

	const gitignorePath = path.join(cwd, ".gitignore");
	if (fs.existsSync(gitignorePath)) {
		const gitignore = fs.readFileSync(gitignorePath, "utf-8");
		if (!gitignore.includes(".env.agents")) {
			fs.appendFileSync(gitignorePath, "\n.env.agents\n", "utf-8");
		}
		if (!gitignore.includes(".ai-agents-sync")) {
			fs.appendFileSync(gitignorePath, "\n.ai-agents-sync\n", "utf-8");
		}
	} else {
		fs.writeFileSync(gitignorePath, ".env.agents\n.ai-agents-sync\n", "utf-8");
	}

	console.log(
		chalk.green("✓ Initialized .ai-agents-sync directory structure."),
	);
}
