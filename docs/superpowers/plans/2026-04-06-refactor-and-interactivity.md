# AIAgentsSync Refactor and Interactive CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the configuration structure, implement persona merging logic, support slash commands, and add an interactive CLI.
**Architecture:** 
- Source of truth now uses `main-agents.md` and `common-agents.md`.
- Rules moved to `agents-instruction/`.
- Config schema updated for `mergeCommonWithMain` and `slashCommands`.
- Interactivity handled by `@clack/prompts`.
**Tech Stack:** Node.js, pnpm, TypeScript, `@clack/prompts`, zod, commander, chalk.

---

### Task 1: Dependencies and Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @clack/prompts**
```bash
pnpm add @clack/prompts
```

- [ ] **Step 2: Update package.json scripts**
Add lint and format scripts using Biome.
```json
{
  "scripts": {
    "lint": "biome lint src/",
    "format": "biome format --write src/",
    "check": "biome check --write src/"
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add package.json
git commit -m "chore: add @clack/prompts and update biome scripts"
```

### Task 2: Schema and Type Updates

**Files:**
- Modify: `src/types/schema.ts`

- [ ] **Step 1: Update AgentTargetSchema and SyncConfigSchema**
```typescript
import { z } from "zod";

export const SlashCommandSchema = z.object({
	command: z.string(),
	description: z.string(),
});

export const AgentTargetSchema = z.object({
	rules: z.array(z.string()).optional().default([]),
	mcpServers: z.array(z.string()).optional().default([]),
	slashCommands: z.array(SlashCommandSchema).optional().default([]),
});

export const SyncConfigSchema = z.object({
	mergeCommonWithMain: z.boolean().optional().default(false),
	root: z.record(z.string(), AgentTargetSchema).optional().default({}),
	workspaces: z
		.record(z.string(), z.record(z.string(), AgentTargetSchema))
		.optional()
		.default({}),
});

export type SlashCommand = z.infer<typeof SlashCommandSchema>;
export type AgentTarget = z.infer<typeof AgentTargetSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export interface AdapterConfig {
	agentName: string;
	targetPath: string;
	basePersona: string;
	rulesContent: string;
	mcpServers: Record<string, unknown>;
	slashCommands: SlashCommand[];
}
```

- [ ] **Step 2: Commit**
```bash
git add src/types/schema.ts
git commit -m "feat: update schemas for mergeCommonWithMain and slashCommands"
```

### Task 3: Adapter Updates for Slash Commands

**Files:**
- Modify: `src/adapters/BaseAdapter.ts`
- Modify: `src/adapters/ClaudeAdapter.ts`
- Modify: `src/adapters/CursorAdapter.ts`
- Modify: `src/adapters/GeminiAdapter.ts`

- [ ] **Step 1: Update BaseAdapter**
No change needed to interface if Task 2 updated `AdapterConfig`.

- [ ] **Step 2: Update ClaudeAdapter to include slash commands**
```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { BaseAdapter } from "./BaseAdapter.js";
import type { AdapterConfig } from "../types/schema.js";

export class ClaudeAdapter extends BaseAdapter {
	generate(config: AdapterConfig): void {
		const outputPath = path.join(config.targetPath, ".claude.json");
		
		let customInstructions = `${config.basePersona}\n\n${config.rulesContent}`.trim();
		
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
		fs.writeFileSync(outputPath, JSON.stringify(claudeConfig, null, 2), "utf-8");
		
		console.log(chalk.green(`✓ Generated Claude config at ${outputPath}`));
	}
}
```

- [ ] **Step 3: Update CursorAdapter to include slash commands**
```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { BaseAdapter } from "./BaseAdapter.js";
import type { AdapterConfig } from "../types/schema.js";

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
```

- [ ] **Step 4: Update GeminiAdapter to include slash commands**
```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { BaseAdapter } from "./BaseAdapter.js";
import type { AdapterConfig } from "../types/schema.js";

export class GeminiAdapter extends BaseAdapter {
	generate(config: AdapterConfig): void {
		const agentsDir = path.join(config.targetPath, ".agents");
		let customInstructions = `${config.basePersona}\n\n${config.rulesContent}`.trim();

		if (config.slashCommands.length > 0) {
			customInstructions += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				customInstructions += `- /${cmd.command}: ${cmd.description}\n`;
			}
		}

		fs.mkdirSync(agentsDir, { recursive: true });
		
		fs.writeFileSync(
			path.join(agentsDir, "AGENTS.md"),
			customInstructions,
			"utf-8",
		);
		
		if (Object.keys(config.mcpServers).length > 0) {
			fs.writeFileSync(
				path.join(agentsDir, "mcp.json"),
				JSON.stringify({ mcpServers: config.mcpServers }, null, 2),
				"utf-8",
			);
		}
		
		console.log(chalk.green(`✓ Generated Gemini config at ${agentsDir}`));
	}
}
```

- [ ] **Step 5: Commit**
```bash
git add src/adapters/
git commit -m "feat: add slash commands support to adapters"
```

### Task 4: Init Command Refactor

**Files:**
- Modify: `src/commands/init.ts`

- [ ] **Step 1: Update scaffolding structure**
Rename `rules/` to `agents-instruction/`, remove `AGENTS.md`, add `main-agents.md` and `common-agents.md`. Update dummy config.
```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

export function initCommand() {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	if (fs.existsSync(syncDir)) {
		console.log(chalk.yellow(".ai-agents-sync directory already exists."));
		return;
	}

	fs.mkdirSync(syncDir, { recursive: true });
	fs.mkdirSync(path.join(syncDir, "agents-instruction"), { recursive: true });
	fs.mkdirSync(path.join(syncDir, "skills"), { recursive: true });

	const envAgentPath = path.join(cwd, ".env.agent");
	if (!fs.existsSync(envAgentPath)) {
		fs.writeFileSync(
			envAgentPath,
			"# Add your agent secrets here\n# GITHUB_TOKEN=\n",
			"utf-8",
		);
	}

	fs.writeFileSync(
		path.join(syncDir, "main-agents.md"),
		"# Root Persona\nYou are an expert developer.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "common-agents.md"),
		"# Common Rules\n- Use ESM.\n- Use TypeScript.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "agents-instruction", "default-rules.md"),
		"- Write clean code.\n- Add tests.\n",
		"utf-8",
	);
	fs.writeFileSync(
		path.join(syncDir, "mcp.json"),
		'{\n  "mcpServers": {}\n}\n',
		"utf-8",
	);

	const configContent = `
export default {
  mergeCommonWithMain: false,
  root: {
    cursor: { rules: ['default-rules.md'], mcpServers: [], slashCommands: [] },
    claude: { rules: ['default-rules.md'], mcpServers: [], slashCommands: [] }
  },
  workspaces: {}
};
`.trim();

	fs.writeFileSync(
		path.join(syncDir, "sync.config.js"),
		configContent,
		"utf-8",
	);

	const gitignorePath = path.join(cwd, ".gitignore");
	if (fs.existsSync(gitignorePath)) {
		const gitignore = fs.readFileSync(gitignorePath, "utf-8");
		if (!gitignore.includes(".env.agent")) {
			fs.appendFileSync(gitignorePath, "\n.env.agent\n", "utf-8");
		}
	} else {
		fs.writeFileSync(gitignorePath, ".env.agent\n", "utf-8");
	}

	console.log(
		chalk.green("✓ Initialized .ai-agents-sync directory structure."),
	);
}
```

- [ ] **Step 2: Commit**
```bash
git add src/commands/init.ts
git commit -m "feat: refactor init command for new persona structure"
```

### Task 5: Apply Command Refactor and Interactivity

**Files:**
- Modify: `src/commands/apply.ts`

- [ ] **Step 1: Implement Interactivity with @clack/prompts**
If no agents are provided as arguments, prompt the user.
```typescript
import * as p from "@clack/prompts";

// ... inside applyCommand ...
let selectedAgents = agents;
if (agents.length === 0) {
    const config = await loadConfig(cwd);
    const availableAgents = new Set<string>();
    for (const agent of Object.keys(config.root)) availableAgents.add(agent);
    for (const ws of Object.values(config.workspaces)) {
        for (const agent of Object.keys(ws)) availableAgents.add(agent);
    }
    
    const options = Array.from(availableAgents).map(a => ({ value: a, label: a }));
    
    const choice = await p.multiselect({
        message: "Select agents to sync:",
        options: options,
        required: false
    });
    
    if (p.isCancel(choice)) {
        p.cancel("Operation cancelled.");
        process.exit(0);
    }
    
    selectedAgents = choice as string[];
}
```

- [ ] **Step 2: Implement Persona Merging Logic**
Load `main-agents.md` and `common-agents.md`.
```typescript
const commonAgentsPath = path.join(syncDir, "common-agents.md");
const commonAgents = fs.existsSync(commonAgentsPath) ? fs.readFileSync(commonAgentsPath, "utf-8") : "";

const mainAgentsPath = path.join(syncDir, "main-agents.md");
const mainAgents = fs.existsSync(mainAgentsPath) ? fs.readFileSync(mainAgentsPath, "utf-8") : "";
```

- [ ] **Step 3: Update processTarget for merging and instructions path**
Root target persona: `main-agents.md` (+ `common-agents.md` if flag set).
Workspace target persona: `common-agents.md` + `[workspace]-agents.md` (if it exists).
Instructions folder: `agents-instruction/`.
```typescript
// For Root
const rootPersona = config.mergeCommonWithMain ? `${mainAgents}\n\n${commonAgents}` : mainAgents;

// For Workspace
const wsAgentFile = path.join(syncDir, `${wsName}-agents.md`); // or some other logic
const wsPersona = fs.existsSync(wsAgentFile) 
    ? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}` 
    : commonAgents;
```
Wait, user said: "if apps/web has different rules created then first common-agents.md + web-agents.md will be merged".
I'll implement a naming convention: `[packageName]-agents.md` (where packageName is the last part of the path, or sanitized).
Or just look for files in `.ai-agents-sync/` that match.

- [ ] **Step 4: Full apply.ts Implementation**
```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import * as p from "@clack/prompts";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
import { injectEnvVars } from "../core/env-injector.js";
import { loadConfig } from "../core/parser.js";

import type { AgentTarget, SyncConfig } from "../types/schema.js";

function getAdapter(agentName: string) {
	switch (agentName.toLowerCase()) {
		case "claude":
			return new ClaudeAdapter();
		case "cursor":
			return new CursorAdapter();
		case "gemini":
			return new GeminiAdapter();
		default:
			return null;
	}
}

export async function applyCommand(agents: string[]) {
	const cwd = process.cwd();
	const syncDir = path.join(cwd, ".ai-agents-sync");

	const config = await loadConfig(cwd);

	let selectedAgents = agents;
	if (agents.length === 0) {
		const availableAgents = new Set<string>();
		for (const agent of Object.keys(config.root)) availableAgents.add(agent);
		for (const ws of Object.values(config.workspaces)) {
			for (const agent of Object.keys(ws)) availableAgents.add(agent);
		}

		if (availableAgents.size === 0) {
			console.log(chalk.yellow("No agents configured in sync.config.js"));
			return;
		}

		const choice = await p.multiselect({
			message: "Select agents to sync:",
			options: Array.from(availableAgents).map((a) => ({ value: a, label: a })),
		});

		if (p.isCancel(choice)) {
			p.cancel("Operation cancelled.");
			process.exit(0);
		}
		selectedAgents = choice as string[];
	}

	const commonAgentsPath = path.join(syncDir, "common-agents.md");
	const commonAgents = fs.existsSync(commonAgentsPath)
		? fs.readFileSync(commonAgentsPath, "utf-8")
		: "";

	const mainAgentsPath = path.join(syncDir, "main-agents.md");
	const mainAgents = fs.existsSync(mainAgentsPath)
		? fs.readFileSync(mainAgentsPath, "utf-8")
		: "";

	const rawMcpContent = fs.existsSync(path.join(syncDir, "mcp.json"))
		? fs.readFileSync(path.join(syncDir, "mcp.json"), "utf-8")
		: '{"mcpServers":{}}';

	const injectedMcpContent = injectEnvVars(rawMcpContent);
	const fullMcpConfig = JSON.parse(injectedMcpContent);

	const processTarget = (
		targetDef: Record<string, AgentTarget>,
		targetPath: string,
		basePersona: string,
	) => {
		for (const [agentName, agentConfig] of Object.entries(targetDef)) {
			if (selectedAgents.length > 0 && !selectedAgents.includes(agentName))
				continue;

			const adapter = getAdapter(agentName);
			if (!adapter) {
				console.warn(
					chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`),
				);
				continue;
			}

			const rulesConfig = agentConfig;
			let rulesContent = "";
			for (const ruleFile of rulesConfig.rules) {
				const rulePath = path.join(syncDir, "agents-instruction", ruleFile);
				if (fs.existsSync(rulePath)) {
					rulesContent += `${fs.readFileSync(rulePath, "utf-8")}\n\n`;
				} else {
					console.warn(
						chalk.yellow(`Warning: Rule file ${ruleFile} not found.`),
					);
				}
			}

			const filteredMcps: Record<string, unknown> = {};
			const allMcps = fullMcpConfig.mcpServers || {};
			for (const srv of rulesConfig.mcpServers) {
				if (allMcps[srv]) {
					filteredMcps[srv] = allMcps[srv];
				} else {
					console.warn(
						chalk.yellow(`Warning: MCP server ${srv} not found in mcp.json.`),
					);
				}
			}

			adapter.generate({
				agentName,
				targetPath,
				basePersona,
				rulesContent,
				mcpServers: filteredMcps,
				slashCommands: rulesConfig.slashCommands || [],
			});
		}
	};

	const rootPersona = config.mergeCommonWithMain
		? `${mainAgents}\n\n${commonAgents}`.trim()
		: mainAgents;

	console.log(chalk.blue("Processing root targets..."));
	processTarget(config.root, cwd, rootPersona);

	console.log(chalk.blue("Processing workspace targets..."));
	for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
		const wsName = path.basename(wsPath);
		const wsAgentFile = path.join(syncDir, `${wsName}-agents.md`);
		const wsPersona = fs.existsSync(wsAgentFile)
			? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
			: commonAgents;

		processTarget(wsDef, path.join(cwd, wsPath), wsPersona);
	}

	console.log(chalk.green("✓ Sync complete!"));
}
```

- [ ] **Step 5: Commit**
```bash
git add src/commands/apply.ts
git commit -m "feat: refactor apply command with interactivity and persona merging"
```
