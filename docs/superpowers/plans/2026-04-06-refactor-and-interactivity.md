# AIAgentsSync Refactor: Interactivity, Adapter Capabilities, and Structure Update

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor AIAgentsSync to support a more flexible directory structure, add adapter capabilities for `.agents` folder support, and implement a fully interactive CLI experience across all commands.

**Architecture:** 
- Source of truth structure updated: `agents-md/`, `slash-commands/*.md`, `skills/`, `mcp.json`.
- Adapters define `Capabilities` (Full/Partial/None support for `.agents` folder).
- `BaseAdapter` handles logic for creating `.agents` or fallback files based on capabilities.
- Common interactive utility for CLI prompts.
- Gitignore management for generated files.

**Tech Stack:** Node.js (ESM), TypeScript, @clack/prompts, Zod, Commander, Biome.

---

### Task 1: Schema and Type Updates

**Files:**
- Modify: `src/types/schema.ts`

- [ ] **Step 1: Remove slashCommands from AgentTargetSchema and update AdapterConfig**

```typescript
import { z } from "zod";

export const AgentTargetSchema = z.object({
	rules: z.array(z.string()).optional().default([]),
	mcpServers: z.array(z.string()).optional().default([]),
});

export const SyncConfigSchema = z.object({
	mergeCommonWithMain: z.boolean().optional().default(false),
	root: z.record(z.string(), AgentTargetSchema).optional().default({}),
	workspaces: z
		.record(z.string(), z.record(z.string(), AgentTargetSchema))
		.optional()
		.default({}),
});

export type AgentTarget = z.infer<typeof AgentTargetSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export interface SlashCommand {
	name: string;
	description: string;
	content: string;
}

export interface AdapterConfig {
	agentName: string;
	targetPath: string;
	basePersona: string;
	rulesContent: string;
	mcpServers: Record<string, unknown>;
	slashCommands: SlashCommand[];
	skills: { name: string; path: string }[];
}

export type AgentsFolderSupport = "full" | "partial" | "none";

export interface AdapterCapabilities {
	agentsFolderSupport: AgentsFolderSupport;
	unsupportedFeatures: ("mcp" | "skills" | "slash-commands" | "agents")[];
	customNames?: {
		folder?: string; // e.g., ".kilocode"
		mcpFile?: string; // e.g., "mcp-config.json"
		mcpKey?: string; // e.g., "mcp"
		skillsFolder?: string;
		commandsFolder?: string;
	};
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/schema.ts
git commit -m "feat: update schema to remove slashCommands and add AdapterCapabilities"
```

### Task 2: Shared Interactive Utility

**Files:**
- Create: `src/core/interactive.ts`

- [ ] **Step 1: Create interactive questions shared across commands**

```typescript
import * as p from "@clack/prompts";

export async function askAgentSelection(availableAgents: string[]) {
	const choice = await p.multiselect({
		message: "Select agents to sync:",
		options: availableAgents.map((a) => ({ value: a, label: a })),
	});
	if (p.isCancel(choice)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}
	return choice as string[];
}

export async function askInitConfig(existingConfig?: any) {
	const group = await p.group(
		{
			agents: () =>
				p.multiselect({
					message: "Which agents are you using?",
					options: [
						{ value: "cursor", label: "Cursor" },
						{ value: "claude", label: "Claude" },
						{ value: "gemini", label: "Gemini" },
					],
					initialValues: existingConfig ? Object.keys(existingConfig.root) : [],
				}),
			mergeCommon: () =>
				p.confirm({
					message: "Merge common-agents.md with main-agents.md by default?",
					initialValue: existingConfig?.mergeCommonWithMain ?? false,
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);
	return group;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/interactive.ts
git commit -m "feat: add common interactive utility"
```

### Task 3: Adapter Refactor for Capabilities

**Files:**
- Modify: `src/adapters/BaseAdapter.ts`
- Modify: `src/adapters/ClaudeAdapter.ts`
- Modify: `src/adapters/CursorAdapter.ts`
- Modify: `src/adapters/GeminiAdapter.ts`

- [ ] **Step 1: Update BaseAdapter with common logic for .agents folder**

```typescript
import fs from "node:fs";
import path from "node:path";
import type { AdapterConfig, AdapterCapabilities } from "../types/schema.js";

export abstract class BaseAdapter {
	abstract capabilities: AdapterCapabilities;

	abstract generate(config: AdapterConfig): void;

	protected ensureDir(dir: string) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	protected updateGitignore(targetPath: string, fileOrFolder: string) {
		const gitignorePath = path.join(process.cwd(), ".gitignore");
		const relativePath = path.relative(process.cwd(), path.join(targetPath, fileOrFolder));
		
		if (fs.existsSync(gitignorePath)) {
			const content = fs.readFileSync(gitignorePath, "utf-8");
			if (!content.includes(relativePath)) {
				fs.appendFileSync(gitignorePath, `\n${relativePath}\n`, "utf-8");
			}
		}
	}
}
```

- [ ] **Step 2: Update GeminiAdapter (Full .agents support, but no MCP in .agents according to user hint)**

Actually, user hint: "if gemini-cli supports skills,commands, agents but not mcp then for it specifically craete mcp related config in its specified output directory and create just mcp files."

```typescript
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { BaseAdapter } from "./BaseAdapter.js";
import type { AdapterConfig, AdapterCapabilities } from "../types/schema.js";

export class GeminiAdapter extends BaseAdapter {
	capabilities: AdapterCapabilities = {
		agentsFolderSupport: "partial",
		unsupportedFeatures: ["mcp"],
	};

	generate(config: AdapterConfig): void {
		const agentsDir = path.join(config.targetPath, ".agents");
		this.ensureDir(agentsDir);

		// Supported by .agents: persona, skills, commands
		const personaContent = `${config.basePersona}\n\n${config.rulesContent}`.trim();
		fs.writeFileSync(path.join(agentsDir, "AGENTS.md"), personaContent, "utf-8");

		// Unsupported: MCP -> create separate mcp.json in targetPath (hypothetically)
		if (Object.keys(config.mcpServers).length > 0) {
			const mcpPath = path.join(config.targetPath, "mcp.json");
			fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers: config.mcpServers }, null, 2), "utf-8");
			this.updateGitignore(config.targetPath, "mcp.json");
		}
		
		this.updateGitignore(config.targetPath, ".agents");
		console.log(chalk.green(`✓ Generated Gemini config at ${config.targetPath}`));
	}
}
```

- [ ] **Step 3: Commit**

```bash
git add src/adapters/
git commit -m "feat: implement adapter capabilities and .agents folder logic"
```

### Task 4: Structure Update and Init/Apply Refactor

**Files:**
- Modify: `src/commands/init.ts`
- Modify: `src/commands/apply.ts`

- [ ] **Step 1: Refactor Init to match expected structure and be interactive**

```typescript
// .ai-agents-sync/
// ├── agents-md/
// ├── mcp.json
// ├── skills/
// ├── slash-commands/
// └── sync.config.json
```

- [ ] **Step 2: Implement Update-Config logic in Init**

- [ ] **Step 3: Refactor Apply to load slash-commands from files**

- [ ] **Step 4: Commit**

```bash
git add src/commands/
git commit -m "feat: refactor init and apply for new structure and interactivity"
```

### Task 5: Documentation Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md with new structure and interactive features**
Add examples of the new directory structure, adapter capabilities, and how to use the interactive CLI.

- [ ] **Step 2: Commit**
```bash
git add README.md
git commit -m "docs: update README with new structure and interactive features"
```

### Task 6: Finishing Touches

- [ ] **Step 1: Final validation of all features**
- [ ] **Step 2: Commit**

```bash
git commit -m "chore: final cleanup and validation"
```
