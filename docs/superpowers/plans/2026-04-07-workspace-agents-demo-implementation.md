# Workspace AGENTS.md + Demo Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine agentsync so workspaces only get AGENTS.md (with workspace-specific rules), while skills/MCP/slash-commands stay at root. Add demo content prompt during init.

**Architecture:** Modify BaseAdapter to support include options, update apply.ts to pass different options for root vs workspace, add demo content creation in init.ts.

**Tech Stack:** Node.js (ESM), TypeScript, Vitest, Biome.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/schema.ts` | Add `includeSkills`, `includeMcp`, `includeSlashCommands` to AdapterConfig |
| `src/adapters/BaseAdapter.ts` | Update buildContent() to check includeSlashCommands, skip skills/MCP when disabled |
| `src/commands/apply.ts` | Pass different options for root vs workspace generation |
| `src/commands/init.ts` | Add demo content prompt and file creation (skills, slash-commands, MCP, .env.agents) |

---

## Tasks

### Task 1: Add Include Options to AdapterConfig

**Files:**
- Modify: `src/types/schema.ts`

- [ ] **Step 1: Add new fields to AdapterConfig**

```typescript
export interface AdapterConfig {
  agentName: string;
  targetPath: string;
  basePersona: string;
  rulesContent: string;
  mcpServers: Record<string, unknown>;
  slashCommands: SlashCommand[];
  skillsSourceDir: string;
  writtenFiles: Set<string>;
  /** Whether to copy skills to target (default true) */
  includeSkills?: boolean;
  /** Whether to write MCP file (default true) */
  includeMcp?: boolean;
  /** Whether to include slash commands in content (default true) */
  includeSlashCommands?: boolean;
}
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: All pass (type change only, no logic change)

- [ ] **Step 3: Commit**

```bash
git add src/types/schema.ts
git commit -m "feat: add includeSkills, includeMcp, includeSlashCommands to AdapterConfig"
```

---

### Task 2: Update BaseAdapter to Respect Include Options

**Files:**
- Modify: `src/adapters/BaseAdapter.ts`

- [ ] **Step 1: Update buildContent() to check includeSlashCommands**

Read `src/adapters/BaseAdapter.ts` lines 80-89 and update:

```typescript
private buildContent(config: AdapterConfig): string {
  let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
  const includeSlash = config.includeSlashCommands !== false;
  if (includeSlash && config.slashCommands && config.slashCommands.length > 0) {
    content += "\n\nAvailable Slash Commands:\n";
    for (const cmd of config.slashCommands) {
      content += `- /${cmd.name}: ${cmd.description}\n`;
    }
  }
  return content;
}
```

- [ ] **Step 2: Update copySkills() to check includeSkills**

Read `src/adapters/BaseAdapter.ts` lines 129-150 and update to check `config.includeSkills`:

```typescript
private copySkills(config: AdapterConfig): void {
  if (config.includeSkills === false) return;
  if (!config.skillsSourceDir || !fs.existsSync(config.skillsSourceDir)) return;
  // ... rest of method unchanged
}
```

- [ ] **Step 3: Update writeOutput() to check includeMcp**

Read `src/adapters/BaseAdapter.ts` lines 91-127 and update MCP file writing:

In the `else` branch (text format), change:
```typescript
if (this.mcpFile !== null) {
```
To:
```typescript
if (this.mcpFile !== null && config.includeMcp !== false) {
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/adapters/BaseAdapter.test.ts`
Expected: May need to update tests if they fail (they likely don't set new flags)

- [ ] **Step 5: Commit**

```bash
git add src/adapters/BaseAdapter.ts
git commit -m "feat: BaseAdapter respects includeSkills, includeMcp, includeSlashCommands flags"
```

---

### Task 3: Update apply.ts for Root vs Workspace Options

**Files:**
- Modify: `src/commands/apply.ts`

- [ ] **Step 1: Update generateForAgents() signature**

Add options parameter to `generateForAgents()` function:

```typescript
const generateForAgents = (
  agentList: string[],
  targetPath: string,
  basePersona: string,
  rules: string[],
  options: { includeSkills: boolean; includeMcp: boolean; includeSlashCommands: boolean },
) => {
```

- [ ] **Step 2: Pass options to adapter.generate()**

Inside the function, update the adapter.generate() call (around line 143):

```typescript
adapter.generate({
  agentName,
  targetPath,
  basePersona,
  rulesContent,
  mcpServers: allMcps,
  slashCommands: slashCommands,
  skillsSourceDir,
  writtenFiles,
  includeSkills: options.includeSkills,
  includeMcp: options.includeMcp,
  includeSlashCommands: options.includeSlashCommands,
});
```

- [ ] **Step 3: Update root call to use full options**

Find the root call (line 163) and change:

```typescript
generateForAgents(defaultAgents, cwd, rootPersona, rootRules);
```

To:

```typescript
generateForAgents(defaultAgents, cwd, rootPersona, rootRules, {
  includeSkills: true,
  includeMcp: true,
  includeSlashCommands: true,
});
```

- [ ] **Step 4: Update workspace call to use limited options**

Find the workspace loop (lines 174-179) and change:

```typescript
generateForAgents(
  defaultAgents,
  path.join(cwd, wsPath),
  wsPersona,
  wsRules,
);
```

To:

```typescript
generateForAgents(
  defaultAgents,
  path.join(cwd, wsPath),
  wsPersona,
  wsRules,
  {
    includeSkills: false,
    includeMcp: false,
    includeSlashCommands: false,
  },
);
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/commands/apply.ts
git commit -m "feat: apply root vs workspace with different include options"
```

---

### Task 4: Add Demo Content Prompt to Init

**Files:**
- Modify: `src/commands/init.ts`

- [ ] **Step 1: Add prompt after agent selection**

Read `src/commands/init.ts` and find where answers are gathered (around line 81). Add after the existing prompts:

```typescript
const addDemo = await p.confirm({
  message: "Would you like to add demo content (skills, MCP, slash-commands)?",
  initialValue: true,
});
```

- [ ] **Step 2: Add demo content creation function**

Add helper function before initCommand:

```typescript
function createDemoContent(syncDir: string) {
  // Demo skill
  fs.mkdirSync(path.join(syncDir, "skills", "demo-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(syncDir, "skills", "demo-skill", "README.md"),
    "# Demo Skill\n\nThis is a sample skill for demonstration.\n",
    "utf-8",
  );

  // Demo slash command
  fs.writeFileSync(
    path.join(syncDir, "slash-commands", "demo.md"),
    "# Demo Command\n\nThis is a sample slash command for demonstration.\n",
    "utf-8",
  );

  // Demo MCP with env vars
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

  // Demo .env.agents with variables
  const envContent = `# Demo environment variables
DEMO_API_KEY_1=https://example-api-1.com
DEMO_API_KEY_2=example_key_2
`;
  fs.writeFileSync(path.join(syncDir, ".env.agents"), envContent, "utf-8");
}
```

- [ ] **Step 3: Call createDemoContent after config creation**

Find where config is written (around line 115 in new structure) and add:

```typescript
if (addDemo) {
  createDemoContent(syncDir);
}
```

- [ ] **Step 4: Update .env.agent to .env.agents in gitignore logic**

Find the gitignore section and change `.env.agent` to `.env.agents`:

```typescript
if (!gitignore.includes(".env.agents")) {
  fs.appendFileSync(gitignorePath, "\n.env.agents\n", "utf-8");
}
```

- [ ] **Step 5: Run build and tests**

Run: `pnpm build && pnpm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/commands/init.ts
git commit -m "feat: add demo content prompt during init"
```

---

### Task 5: Update env-injector to Use .env.agents

**Files:**
- Modify: `src/core/env-injector.ts`

- [ ] **Step 1: Update env file path**

Read `src/core/env-injector.ts` and change the env file path:

From: `.env.agent`
To: `.ai-agents-sync/.env.agents`

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/core/env-injector.ts
git commit -m "feat: update env-injector to use .ai-agents-sync/.env.agents"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All pass (44+ tests)

- [ ] **Step 2: Run lint**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: workspace AGENTS.md only, demo content on init"
```