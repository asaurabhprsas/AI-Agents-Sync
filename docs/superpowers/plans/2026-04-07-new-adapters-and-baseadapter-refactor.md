# New Adapters + BaseAdapter Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend agentsync with GitignoreManager, AGENTS.md deduplication, six new agent adapters (RooCode, KiloCode, Windsurf, OpenCode, Antigravity, Copilot), and fix existing adapters (Claude → CLAUDE.md, Gemini → root AGENTS.md, Cursor → MCP, skills API change).

**Architecture:** `BaseAdapter` gains `agentDir`, `gitignoreOutputFile`, and `writesAgentsMd` properties plus a `GitignoreManager` utility for clean no-duplicate gitignore mutations. All adapters that write `AGENTS.md` share a `writtenFiles: Set<string>` in `AdapterConfig` to prevent double-writes at the same path.

**Tech Stack:** Node.js (ESM), TypeScript, Vitest (mocked `fs`), Biome.

---

## File Map

### New files
- `src/utils/gitignore.ts` — `GitignoreManager` class
- `src/utils/gitignore.test.ts` — unit tests for GitignoreManager
- `src/adapters/RooCodeAdapter.ts`
- `src/adapters/RooCodeAdapter.test.ts`
- `src/adapters/KiloCodeAdapter.ts`
- `src/adapters/KiloCodeAdapter.test.ts`
- `src/adapters/WindsurfAdapter.ts`
- `src/adapters/WindsurfAdapter.test.ts`
- `src/adapters/OpenCodeAdapter.ts`
- `src/adapters/OpenCodeAdapter.test.ts`
- `src/adapters/AntigravityAdapter.ts`
- `src/adapters/AntigravityAdapter.test.ts`
- `src/adapters/CopilotAdapter.ts`
- `src/adapters/CopilotAdapter.test.ts`

### Modified files
- `src/types/schema.ts` — add `writtenFiles`, change `skills` field, add `skillsSourceDir`
- `src/adapters/BaseAdapter.ts` — new abstract props, use GitignoreManager, new skills copy logic, AGENTS.md dedup
- `src/adapters/ClaudeAdapter.ts` — output `CLAUDE.md` (text), gitignoreOutputFile=false
- `src/adapters/ClaudeAdapter.test.ts` — update expectations
- `src/adapters/GeminiAdapter.ts` — output root `AGENTS.md`, fix MCP file path
- `src/adapters/GeminiAdapter.test.ts` — update expectations
- `src/adapters/CursorAdapter.ts` — add MCP support (`.cursor/mcp.json`)
- `src/adapters/CursorAdapter.test.ts` — update expectations
- `src/commands/apply.ts` — pass `writtenFiles`, `skillsSourceDir`, use adapter registry
- `src/core/interactive.ts` — add all new agents to selection list

---

## Tasks

### Task 1: GitignoreManager utility

**Files:**
- Create: `src/utils/gitignore.ts`
- Create: `src/utils/gitignore.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/utils/gitignore.test.ts
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitignoreManager } from "./gitignore.js";

vi.mock("fs");

describe("GitignoreManager", () => {
  afterEach(() => vi.restoreAllMocks());

  it("adds a new entry when it does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("node_modules/\n");
    const manager = new GitignoreManager("/project/.gitignore");
    manager.ignore(".cursor/");
    manager.flush();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/.gitignore",
      "node_modules/\n.cursor/\n",
      "utf-8",
    );
  });

  it("does not add a duplicate entry", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("node_modules/\n.cursor/\n");
    const manager = new GitignoreManager("/project/.gitignore");
    manager.ignore(".cursor/");
    manager.flush();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("adds a negation entry to preserve a pre-existing file", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(".gemini/\n");
    const manager = new GitignoreManager("/project/.gitignore");
    manager.negate(".gemini/config.json");
    manager.flush();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/.gitignore",
      ".gemini/\n!.gemini/config.json\n",
      "utf-8",
    );
  });

  it("does not add a duplicate negation entry", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      ".gemini/\n!.gemini/config.json\n",
    );
    const manager = new GitignoreManager("/project/.gitignore");
    manager.negate(".gemini/config.json");
    manager.flush();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("creates .gitignore if it does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const manager = new GitignoreManager("/project/.gitignore");
    manager.ignore(".cursor/");
    manager.flush();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/.gitignore",
      ".cursor/\n",
      "utf-8",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/gitignore.test.ts`
Expected: FAIL — `GitignoreManager` does not exist yet.

- [ ] **Step 3: Implement GitignoreManager**

```typescript
// src/utils/gitignore.ts
import fs from "node:fs";

export class GitignoreManager {
  private lines: string[];
  private dirty = false;

  constructor(private readonly gitignorePath: string) {
    if (fs.existsSync(gitignorePath)) {
      const raw = fs.readFileSync(gitignorePath, "utf-8");
      this.lines = raw.split("\n");
      if (this.lines[this.lines.length - 1] === "") {
        this.lines.pop();
      }
    } else {
      this.lines = [];
    }
  }

  ignore(entry: string): void {
    if (!this.lines.includes(entry)) {
      this.lines.push(entry);
      this.dirty = true;
    }
  }

  negate(entry: string): void {
    const neg = `!${entry}`;
    if (!this.lines.includes(neg)) {
      this.lines.push(neg);
      this.dirty = true;
    }
  }

  flush(): void {
    if (!this.dirty) return;
    fs.writeFileSync(this.gitignorePath, this.lines.join("\n") + "\n", "utf-8");
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/utils/gitignore.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/gitignore.ts src/utils/gitignore.test.ts
git commit -m "feat: add GitignoreManager utility"
```

---

### Task 2: Update schema types

**Files:**
- Modify: `src/types/schema.ts`

Replace `skills: {name,path}[]` with `skillsSourceDir: string` and add `writtenFiles: Set<string>`.

- [ ] **Step 1: Update schema.ts**

Full updated file:

```typescript
import { z } from "zod";

export const AgentTargetSchema = z.object({
  rules: z.array(z.string()).optional().default([]),
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
  /** Absolute path to .ai-agents-sync/skills/ — all subdirs are copied as skills */
  skillsSourceDir: string;
  /** Tracks files already written in this run to avoid duplicate writes */
  writtenFiles: Set<string>;
}

export type AgentsFolderSupport = "full" | "partial" | "none";

export interface AdapterCapabilities {
  agentsFolderSupport: AgentsFolderSupport;
  unsupportedFeatures: ("mcp" | "skills" | "slash-commands" | "agents")[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/schema.ts
git commit -m "feat: replace skills array with skillsSourceDir and add writtenFiles to AdapterConfig"
```

---

### Task 3: Refactor BaseAdapter

**Files:**
- Modify: `src/adapters/BaseAdapter.ts`

Changes:
- Import and use `GitignoreManager`
- New abstract props: `agentDir: string | null`, `gitignoreOutputFile: boolean`
- `copySkills` uses `skillsSourceDir` (scans dir, copies all subdirs)
- `applyGitignore` snapshots pre-existing files in `agentDir` before writing, adds negations
- AGENTS.md dedup via `writtenFiles`
- When `agentDir` is set but `outputFile` is outside it, gitignore the outputFile separately too

- [ ] **Step 1: Rewrite BaseAdapter**

```typescript
// src/adapters/BaseAdapter.ts
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { GitignoreManager } from "../utils/gitignore.js";
import type {
  AdapterCapabilities,
  AdapterConfig,
  AgentsFolderSupport,
} from "../types/schema.js";

export abstract class BaseAdapter {
  abstract readonly outputFile: string;
  abstract readonly outputFormat: "json" | "text";
  abstract readonly instructionsKey: string;
  abstract readonly mcpKey: string;
  abstract readonly mcpFile: string | null;
  abstract readonly skillDir: string;
  /** Top-level agent dir to gitignore (e.g. ".cursor"). null = no dir. */
  abstract readonly agentDir: string | null;
  /** If false, output is committed (AGENTS.md, CLAUDE.md). If true, gitignored. */
  abstract readonly gitignoreOutputFile: boolean;
  abstract readonly agentsFolderSupport: AgentsFolderSupport;
  abstract readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"];

  get capabilities(): AdapterCapabilities {
    return {
      agentsFolderSupport: this.agentsFolderSupport,
      unsupportedFeatures: this.unsupportedFeatures,
    };
  }

  generate(config: AdapterConfig): void {
    const preExistingFiles = this.snapshotAgentDir(config.targetPath);

    const content = this.buildContent(config);
    this.writeOutput(config, content);
    this.copySkills(config);
    this.applyGitignore(config, preExistingFiles);

    console.log(
      chalk.green(`✓ Generated ${config.agentName} config at ${config.targetPath}`),
    );
  }

  private snapshotAgentDir(targetPath: string): string[] {
    if (!this.agentDir) return [];
    const dirPath = path.join(targetPath, this.agentDir);
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.join(this.agentDir as string, e.name));
  }

  private buildContent(config: AdapterConfig): string {
    let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
    if (config.slashCommands && config.slashCommands.length > 0) {
      content += "\n\nAvailable Slash Commands:\n";
      for (const cmd of config.slashCommands) {
        content += `- /${cmd.name}: ${cmd.description}\n`;
      }
    }
    return content;
  }

  private writeOutput(config: AdapterConfig, content: string): void {
    const outputPath = path.join(config.targetPath, this.outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // AGENTS.md deduplication: only write once per absolute path per run
    const isAgentsMd =
      path.basename(this.outputFile) === "AGENTS.md" &&
      this.outputFormat === "text";
    if (isAgentsMd) {
      if (config.writtenFiles.has(outputPath)) return;
      config.writtenFiles.add(outputPath);
    }

    if (this.outputFormat === "json") {
      const jsonOutput: Record<string, unknown> = {
        [this.instructionsKey]: content,
        [this.mcpKey]: config.mcpServers,
      };
      fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2), "utf-8");
    } else {
      fs.writeFileSync(outputPath, content, "utf-8");

      if (this.mcpFile !== null) {
        const mcpPath = path.join(config.targetPath, this.mcpFile);
        fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
        fs.writeFileSync(
          mcpPath,
          JSON.stringify({ [this.mcpKey]: config.mcpServers }, null, 2),
          "utf-8",
        );
      }
    }
  }

  private copySkills(config: AdapterConfig): void {
    if (!config.skillsSourceDir || !fs.existsSync(config.skillsSourceDir)) return;

    const entries = fs.readdirSync(config.skillsSourceDir, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory());
    if (skillDirs.length === 0) return;

    const destSkillsDir = path.join(config.targetPath, this.skillDir);
    this.ensureDir(destSkillsDir);

    for (const skillEntry of skillDirs) {
      const srcDir = path.join(config.skillsSourceDir, skillEntry.name);
      const destDir = path.join(destSkillsDir, skillEntry.name);
      this.ensureDir(destDir);
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
    }
  }

  private applyGitignore(config: AdapterConfig, preExistingFiles: string[]): void {
    if (!this.gitignoreOutputFile) return;

    const gitignorePath = path.join(process.cwd(), ".gitignore");
    const manager = new GitignoreManager(gitignorePath);
    const cwd = process.cwd();

    // Ignore the agent dir (if set) or output file directly
    if (this.agentDir) {
      const relDir = path.relative(cwd, path.join(config.targetPath, this.agentDir));
      manager.ignore(`${relDir}/`);

      // Also ignore outputFile if it lives OUTSIDE agentDir
      if (!this.outputFile.startsWith(this.agentDir + "/")) {
        const relOutput = path.relative(cwd, path.join(config.targetPath, this.outputFile));
        manager.ignore(relOutput);
      }
    } else {
      const relOutput = path.relative(cwd, path.join(config.targetPath, this.outputFile));
      manager.ignore(relOutput);
    }

    // Negate pre-existing files so they stay committed
    for (const preExistingRelPath of preExistingFiles) {
      const relPath = path.relative(cwd, path.join(config.targetPath, preExistingRelPath));
      manager.negate(relPath);
    }

    manager.flush();
  }

  protected ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
```

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: Failures in adapter tests because they still pass old `skills` field. That is expected and will be fixed in Tasks 4-6.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/BaseAdapter.ts
git commit -m "refactor: rewrite BaseAdapter with GitignoreManager, skillsSourceDir, agentDir, writtenFiles"
```

---

### Task 4: Fix ClaudeAdapter — output CLAUDE.md

**Files:**
- Modify: `src/adapters/ClaudeAdapter.ts`
- Modify: `src/adapters/ClaudeAdapter.test.ts`

- [ ] **Step 1: Update ClaudeAdapter**

```typescript
// src/adapters/ClaudeAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class ClaudeAdapter extends BaseAdapter {
  readonly outputFile = "CLAUDE.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = null;
  readonly skillDir = ".claude/skills";
  readonly agentDir = ".claude";
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "partial";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 2: Update ClaudeAdapter tests**

```typescript
// src/adapters/ClaudeAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAdapter } from "./ClaudeAdapter.js";

vi.mock("fs");

describe("ClaudeAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "claude",
      targetPath: "/mock/path",
      basePersona: "You are a helpful assistant.",
      rulesContent: "- Always write tests.",
      mcpServers: { testServer: { command: "test" } },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("generates a CLAUDE.md file with combined persona and rules", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new ClaudeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "CLAUDE.md"),
      "You are a helpful assistant.\n\n- Always write tests.",
      "utf-8",
    );
  });

  it("generates a CLAUDE.md file with slash commands in content", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new ClaudeAdapter();
    adapter.generate(makeConfig({
      basePersona: "You are Claude.",
      rulesContent: "- Write tests.",
      mcpServers: {},
      slashCommands: [{ name: "fix", description: "Fix code", content: "fix fix" }],
    }));

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "CLAUDE.md"),
      expect.stringContaining("Available Slash Commands:\n- /fix: Fix code"),
      "utf-8",
    );
  });

  it("does not gitignore CLAUDE.md", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.gitignoreOutputFile).toBe(false);
  });

  it("reports partial .agents support", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
  });
});
```

- [ ] **Step 3: Run ClaudeAdapter tests**

Run: `pnpm test src/adapters/ClaudeAdapter.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/ClaudeAdapter.ts src/adapters/ClaudeAdapter.test.ts
git commit -m "feat: ClaudeAdapter writes CLAUDE.md as plain text, gitignoreOutputFile=false"
```

---

### Task 5: Fix GeminiAdapter — root AGENTS.md

**Files:**
- Modify: `src/adapters/GeminiAdapter.ts`
- Modify: `src/adapters/GeminiAdapter.test.ts`

- [ ] **Step 1: Update GeminiAdapter**

```typescript
// src/adapters/GeminiAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class GeminiAdapter extends BaseAdapter {
  readonly outputFile = "AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".gemini/mcp.json";
  readonly skillDir = ".gemini/skills";
  readonly agentDir = ".gemini";
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "partial";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 2: Update GeminiAdapter tests**

```typescript
// src/adapters/GeminiAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiAdapter } from "./GeminiAdapter.js";

vi.mock("fs");

describe("GeminiAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "gemini",
      targetPath: "/mock/path",
      basePersona: "You are Gemini.",
      rulesContent: "- Be helpful.",
      mcpServers: { server1: {} },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md at root with persona and rules", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new GeminiAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "AGENTS.md"),
      "You are Gemini.\n\n- Be helpful.",
      "utf-8",
    );
  });

  it("writes MCP to .gemini/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new GeminiAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".gemini/mcp.json"),
      expect.stringContaining('"server1"'),
      "utf-8",
    );
  });

  it("does not write AGENTS.md twice to the same path", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new GeminiAdapter();
    const writtenFiles = new Set<string>();
    adapter.generate(makeConfig({ writtenFiles }));
    adapter.generate(makeConfig({ writtenFiles }));

    const agentsMdCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
    expect(agentsMdCalls).toHaveLength(1);
  });

  it("reports partial .agents support", () => {
    const adapter = new GeminiAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
  });
});
```

- [ ] **Step 3: Run GeminiAdapter tests**

Run: `pnpm test src/adapters/GeminiAdapter.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/GeminiAdapter.ts src/adapters/GeminiAdapter.test.ts
git commit -m "feat: GeminiAdapter writes root AGENTS.md and .gemini/mcp.json"
```

---

### Task 6: Fix CursorAdapter — add MCP support

**Files:**
- Modify: `src/adapters/CursorAdapter.ts`
- Modify: `src/adapters/CursorAdapter.test.ts`

- [ ] **Step 1: Update CursorAdapter**

```typescript
// src/adapters/CursorAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CursorAdapter extends BaseAdapter {
  readonly outputFile = ".cursorrules";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".cursor/mcp.json";
  readonly skillDir = ".cursor/skills";
  readonly agentDir = ".cursor";
  readonly gitignoreOutputFile = true;
  readonly agentsFolderSupport: AgentsFolderSupport = "none";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = ["agents"];
}
```

- [ ] **Step 2: Update CursorAdapter tests**

```typescript
// src/adapters/CursorAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorAdapter } from "./CursorAdapter.js";

vi.mock("fs");

describe("CursorAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "cursor",
      targetPath: "/mock/path",
      basePersona: "You are Cursor.",
      rulesContent: "- Do not break code.",
      mcpServers: { cursor_mcp: { command: "run" } },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("generates a .cursorrules file", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CursorAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".cursorrules"),
      "You are Cursor.\n\n- Do not break code.",
      "utf-8",
    );
  });

  it("writes MCP to .cursor/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CursorAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".cursor/mcp.json"),
      expect.stringContaining('"cursor_mcp"'),
      "utf-8",
    );
  });

  it("generates a .cursorrules file with slash commands in content", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CursorAdapter();
    adapter.generate(makeConfig({
      slashCommands: [{ name: "bug", description: "Fix bug", content: "fix fix" }],
    }));

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".cursorrules"),
      expect.stringContaining("Available Slash Commands:\n- /bug: Fix bug"),
      "utf-8",
    );
  });

  it("reports no .agents support", () => {
    const adapter = new CursorAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("none");
    expect(adapter.capabilities.unsupportedFeatures).toContain("agents");
  });
});
```

- [ ] **Step 3: Run CursorAdapter tests**

Run: `pnpm test src/adapters/CursorAdapter.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/CursorAdapter.ts src/adapters/CursorAdapter.test.ts
git commit -m "feat: CursorAdapter adds .cursor/mcp.json support"
```

---

### Task 7: RooCodeAdapter

**Files:**
- Create: `src/adapters/RooCodeAdapter.ts`
- Create: `src/adapters/RooCodeAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/RooCodeAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RooCodeAdapter } from "./RooCodeAdapter.js";

vi.mock("fs");

describe("RooCodeAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "roocode",
      targetPath: "/mock/path",
      basePersona: "You are RooCode.",
      rulesContent: "- Follow the rules.",
      mcpServers: { roo_server: {} },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md inside .roo/", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new RooCodeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".roo/AGENTS.md"),
      "You are RooCode.\n\n- Follow the rules.",
      "utf-8",
    );
  });

  it("writes MCP to .roo/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new RooCodeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".roo/mcp.json"),
      expect.stringContaining('"roo_server"'),
      "utf-8",
    );
  });

  it("reports full .agents support", () => {
    const adapter = new RooCodeAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("full");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement RooCodeAdapter**

```typescript
// src/adapters/RooCodeAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class RooCodeAdapter extends BaseAdapter {
  readonly outputFile = ".roo/AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".roo/mcp.json";
  readonly skillDir = ".roo/skills";
  readonly agentDir = ".roo";
  readonly gitignoreOutputFile = true;
  readonly agentsFolderSupport: AgentsFolderSupport = "full";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 4: Run tests — expect 3 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/RooCodeAdapter.ts src/adapters/RooCodeAdapter.test.ts
git commit -m "feat: add RooCodeAdapter"
```

---

### Task 8: KiloCodeAdapter

**Files:**
- Create: `src/adapters/KiloCodeAdapter.ts`
- Create: `src/adapters/KiloCodeAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/KiloCodeAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KiloCodeAdapter } from "./KiloCodeAdapter.js";

vi.mock("fs");

describe("KiloCodeAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "kilocode",
      targetPath: "/mock/path",
      basePersona: "You are KiloCode.",
      rulesContent: "- Be precise.",
      mcpServers: { kilo_server: {} },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md at project root", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new KiloCodeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "AGENTS.md"),
      "You are KiloCode.\n\n- Be precise.",
      "utf-8",
    );
  });

  it("writes MCP to .kilocode/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new KiloCodeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".kilocode/mcp.json"),
      expect.stringContaining('"kilo_server"'),
      "utf-8",
    );
  });

  it("deduplicates AGENTS.md when writtenFiles already has it", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new KiloCodeAdapter();
    const writtenFiles = new Set<string>();
    adapter.generate(makeConfig({ writtenFiles }));
    adapter.generate(makeConfig({ writtenFiles }));

    const agentsMdCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
    expect(agentsMdCalls).toHaveLength(1);
  });

  it("reports full .agents support", () => {
    const adapter = new KiloCodeAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("full");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement KiloCodeAdapter**

```typescript
// src/adapters/KiloCodeAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class KiloCodeAdapter extends BaseAdapter {
  readonly outputFile = "AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".kilocode/mcp.json";
  readonly skillDir = ".kilocode/skills";
  readonly agentDir = ".kilocode";
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "full";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 4: Run tests — expect 4 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/KiloCodeAdapter.ts src/adapters/KiloCodeAdapter.test.ts
git commit -m "feat: add KiloCodeAdapter"
```

---

### Task 9: WindsurfAdapter

**Files:**
- Create: `src/adapters/WindsurfAdapter.ts`
- Create: `src/adapters/WindsurfAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/WindsurfAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WindsurfAdapter } from "./WindsurfAdapter.js";

vi.mock("fs");

describe("WindsurfAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "windsurf",
      targetPath: "/mock/path",
      basePersona: "You are Windsurf.",
      rulesContent: "- Surf with style.",
      mcpServers: { wind_server: {} },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md at project root", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new WindsurfAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "AGENTS.md"),
      "You are Windsurf.\n\n- Surf with style.",
      "utf-8",
    );
  });

  it("writes MCP to .windsurf/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new WindsurfAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".windsurf/mcp.json"),
      expect.stringContaining('"wind_server"'),
      "utf-8",
    );
  });

  it("deduplicates AGENTS.md across adapters sharing writtenFiles", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new WindsurfAdapter();
    const writtenFiles = new Set<string>();
    adapter.generate(makeConfig({ writtenFiles }));
    adapter.generate(makeConfig({ writtenFiles }));

    const agentsMdCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
    expect(agentsMdCalls).toHaveLength(1);
  });

  it("reports partial .agents support", () => {
    const adapter = new WindsurfAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement WindsurfAdapter**

```typescript
// src/adapters/WindsurfAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class WindsurfAdapter extends BaseAdapter {
  readonly outputFile = "AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".windsurf/mcp.json";
  readonly skillDir = ".windsurf/skills";
  readonly agentDir = ".windsurf";
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "partial";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 4: Run tests — expect 4 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/WindsurfAdapter.ts src/adapters/WindsurfAdapter.test.ts
git commit -m "feat: add WindsurfAdapter"
```

---

### Task 10: OpenCodeAdapter

**Files:**
- Create: `src/adapters/OpenCodeAdapter.ts`
- Create: `src/adapters/OpenCodeAdapter.test.ts`

Special: reads and merges existing `opencode.json`, writes MCP under `mcp` key (not `mcpServers`). Overrides `generate()` entirely.

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/OpenCodeAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenCodeAdapter } from "./OpenCodeAdapter.js";

vi.mock("fs");

describe("OpenCodeAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "opencode",
      targetPath: "/mock/path",
      basePersona: "You are OpenCode.",
      rulesContent: "- Use superpowers.",
      mcpServers: { oc_server: { type: "local", command: "run" } },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md at project root", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new OpenCodeAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "AGENTS.md"),
      "You are OpenCode.\n\n- Use superpowers.",
      "utf-8",
    );
  });

  it("merges MCP into existing opencode.json under mcp key", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("opencode.json"),
    );
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith("opencode.json")) {
        return JSON.stringify({ theme: "dark", model: "gpt-4" });
      }
      return "";
    });

    const adapter = new OpenCodeAdapter();
    adapter.generate(makeConfig());

    const call = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([p]) => String(p).endsWith("opencode.json"));
    expect(call).toBeDefined();
    const written = JSON.parse(call![1] as string);
    expect(written.theme).toBe("dark");
    expect(written.model).toBe("gpt-4");
    expect(written.mcp).toEqual({ oc_server: { type: "local", command: "run" } });
  });

  it("creates opencode.json when it does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new OpenCodeAdapter();
    adapter.generate(makeConfig());

    const call = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find(([p]) => String(p).endsWith("opencode.json"));
    expect(call).toBeDefined();
    const written = JSON.parse(call![1] as string);
    expect(written.mcp).toEqual({ oc_server: { type: "local", command: "run" } });
  });

  it("deduplicates AGENTS.md", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new OpenCodeAdapter();
    const writtenFiles = new Set<string>();
    adapter.generate(makeConfig({ writtenFiles }));
    adapter.generate(makeConfig({ writtenFiles }));

    const agentsMdCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
    expect(agentsMdCalls).toHaveLength(1);
  });

  it("reports partial .agents support", () => {
    const adapter = new OpenCodeAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement OpenCodeAdapter**

```typescript
// src/adapters/OpenCodeAdapter.ts
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { AdapterCapabilities, AdapterConfig, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class OpenCodeAdapter extends BaseAdapter {
  readonly outputFile = "AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcp";
  readonly mcpFile = null;
  readonly skillDir = ".agents/skills";
  readonly agentDir = null;
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "partial";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];

  override generate(config: AdapterConfig): void {
    // 1. Write AGENTS.md (deduped)
    const agentsMdPath = path.join(config.targetPath, "AGENTS.md");
    if (!config.writtenFiles.has(agentsMdPath)) {
      config.writtenFiles.add(agentsMdPath);
      let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
      if (config.slashCommands.length > 0) {
        content += "\n\nAvailable Slash Commands:\n";
        for (const cmd of config.slashCommands) {
          content += `- /${cmd.name}: ${cmd.description}\n`;
        }
      }
      fs.mkdirSync(path.dirname(agentsMdPath), { recursive: true });
      fs.writeFileSync(agentsMdPath, content, "utf-8");
    }

    // 2. Merge MCP into opencode.json preserving all existing keys
    const opencodePath = path.join(config.targetPath, "opencode.json");
    let existing: Record<string, unknown> = {};
    if (fs.existsSync(opencodePath)) {
      existing = JSON.parse(fs.readFileSync(opencodePath, "utf-8") as string);
    }
    existing.mcp = config.mcpServers;
    fs.writeFileSync(opencodePath, JSON.stringify(existing, null, 2), "utf-8");

    console.log(
      chalk.green(`✓ Generated ${config.agentName} config at ${config.targetPath}`),
    );
  }
}
```

- [ ] **Step 4: Run tests — expect 5 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/OpenCodeAdapter.ts src/adapters/OpenCodeAdapter.test.ts
git commit -m "feat: add OpenCodeAdapter (AGENTS.md + opencode.json mcp merge)"
```

---

### Task 11: AntigravityAdapter

**Files:**
- Create: `src/adapters/AntigravityAdapter.ts`
- Create: `src/adapters/AntigravityAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/AntigravityAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AntigravityAdapter } from "./AntigravityAdapter.js";

vi.mock("fs");

describe("AntigravityAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "antigravity",
      targetPath: "/mock/path",
      basePersona: "You are Antigravity.",
      rulesContent: "- Defy gravity.",
      mcpServers: { ag_server: {} },
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md inside .gemini/antigravity/", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new AntigravityAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".gemini/antigravity/AGENTS.md"),
      "You are Antigravity.\n\n- Defy gravity.",
      "utf-8",
    );
  });

  it("writes MCP to .gemini/antigravity/mcp.json", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new AntigravityAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", ".gemini/antigravity/mcp.json"),
      expect.stringContaining('"ag_server"'),
      "utf-8",
    );
  });

  it("reports partial .agents support", () => {
    const adapter = new AntigravityAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement AntigravityAdapter**

```typescript
// src/adapters/AntigravityAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class AntigravityAdapter extends BaseAdapter {
  readonly outputFile = ".gemini/antigravity/AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = ".gemini/antigravity/mcp.json";
  readonly skillDir = ".gemini/antigravity/skills";
  readonly agentDir = ".gemini";
  readonly gitignoreOutputFile = true;
  readonly agentsFolderSupport: AgentsFolderSupport = "partial";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];
}
```

- [ ] **Step 4: Run tests — expect 3 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/AntigravityAdapter.ts src/adapters/AntigravityAdapter.test.ts
git commit -m "feat: add AntigravityAdapter"
```

---

### Task 12: CopilotAdapter

**Files:**
- Create: `src/adapters/CopilotAdapter.ts`
- Create: `src/adapters/CopilotAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/adapters/CopilotAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopilotAdapter } from "./CopilotAdapter.js";

vi.mock("fs");

describe("CopilotAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeConfig(overrides = {}) {
    return {
      agentName: "copilot",
      targetPath: "/mock/path",
      basePersona: "You are Copilot.",
      rulesContent: "- Help the developer.",
      mcpServers: {},
      slashCommands: [],
      skillsSourceDir: "/mock/.ai-agents-sync/skills",
      writtenFiles: new Set<string>(),
      ...overrides,
    };
  }

  it("writes AGENTS.md at project root", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CopilotAdapter();
    adapter.generate(makeConfig());

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join("/mock/path", "AGENTS.md"),
      "You are Copilot.\n\n- Help the developer.",
      "utf-8",
    );
  });

  it("does not write an MCP file", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CopilotAdapter();
    adapter.generate(makeConfig());

    const mcpCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).includes("mcp"));
    expect(mcpCalls).toHaveLength(0);
  });

  it("deduplicates AGENTS.md when shared writtenFiles", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = new CopilotAdapter();
    const writtenFiles = new Set<string>();
    adapter.generate(makeConfig({ writtenFiles }));
    adapter.generate(makeConfig({ writtenFiles }));

    const agentsMdCalls = vi
      .mocked(fs.writeFileSync)
      .mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
    expect(agentsMdCalls).toHaveLength(1);
  });

  it("reports no .agents support", () => {
    const adapter = new CopilotAdapter();
    expect(adapter.capabilities.agentsFolderSupport).toBe("none");
    expect(adapter.capabilities.unsupportedFeatures).toContain("agents");
    expect(adapter.capabilities.unsupportedFeatures).toContain("mcp");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement CopilotAdapter**

```typescript
// src/adapters/CopilotAdapter.ts
import type { AdapterCapabilities, AgentsFolderSupport } from "../types/schema.js";
import { BaseAdapter } from "./BaseAdapter.js";

export class CopilotAdapter extends BaseAdapter {
  readonly outputFile = "AGENTS.md";
  readonly outputFormat = "text" as const;
  readonly instructionsKey = "";
  readonly mcpKey = "mcpServers";
  readonly mcpFile = null;
  readonly skillDir = ".github/skills";
  readonly agentDir = ".github";
  readonly gitignoreOutputFile = false;
  readonly agentsFolderSupport: AgentsFolderSupport = "none";
  readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [
    "agents",
    "mcp",
  ];
}
```

- [ ] **Step 4: Run tests — expect 4 PASS**
- [ ] **Step 5: Commit**

```bash
git add src/adapters/CopilotAdapter.ts src/adapters/CopilotAdapter.test.ts
git commit -m "feat: add CopilotAdapter"
```

---

### Task 13: Update apply.ts and interactive.ts

**Files:**
- Modify: `src/commands/apply.ts`
- Modify: `src/core/interactive.ts`

- [ ] **Step 1: Update apply.ts** — wire all 9 adapters, replace `loadSkills()` with `skillsSourceDir`, pass `writtenFiles`

```typescript
// src/commands/apply.ts
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { AntigravityAdapter } from "../adapters/AntigravityAdapter.js";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { CopilotAdapter } from "../adapters/CopilotAdapter.js";
import { CursorAdapter } from "../adapters/CursorAdapter.js";
import { GeminiAdapter } from "../adapters/GeminiAdapter.js";
import { KiloCodeAdapter } from "../adapters/KiloCodeAdapter.js";
import { OpenCodeAdapter } from "../adapters/OpenCodeAdapter.js";
import { RooCodeAdapter } from "../adapters/RooCodeAdapter.js";
import { WindsurfAdapter } from "../adapters/WindsurfAdapter.js";
import { injectEnvVars } from "../core/env-injector.js";
import { askAgentSelection } from "../core/interactive.js";
import { loadConfig } from "../core/parser.js";
import type { AgentTarget, SlashCommand } from "../types/schema.js";

function getAdapter(agentName: string) {
  switch (agentName.toLowerCase()) {
    case "claude": return new ClaudeAdapter();
    case "cursor": return new CursorAdapter();
    case "gemini": return new GeminiAdapter();
    case "roocode": return new RooCodeAdapter();
    case "kilocode": return new KiloCodeAdapter();
    case "windsurf": return new WindsurfAdapter();
    case "opencode": return new OpenCodeAdapter();
    case "antigravity": return new AntigravityAdapter();
    case "copilot": return new CopilotAdapter();
    default: return null;
  }
}

function loadSlashCommands(syncDir: string): SlashCommand[] {
  const commandsDir = path.join(syncDir, "slash-commands");
  if (!fs.existsSync(commandsDir)) return [];
  const commands: SlashCommand[] = [];
  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"))) {
    const filePath = path.join(commandsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const commandName = file.replace(".md", "");
    const descriptionMatch = content.match(/^#\s*(.+?)(?:\n|$)/);
    const description = descriptionMatch ? descriptionMatch[1] : `/${commandName}`;
    commands.push({ name: commandName, description: description.trim(), content });
  }
  return commands;
}

export async function applyCommand(agents: string[]) {
  const cwd = process.cwd();
  const syncDir = path.join(cwd, ".ai-agents-sync");
  const config = await loadConfig(cwd);
  const slashCommands = loadSlashCommands(syncDir);
  const skillsSourceDir = path.join(syncDir, "skills");
  const writtenFiles = new Set<string>();

  let selectedAgents = agents;
  if (agents.length === 0) {
    const availableAgents = new Set<string>();
    for (const agent of Object.keys(config.root)) availableAgents.add(agent);
    for (const ws of Object.values(config.workspaces))
      for (const agent of Object.keys(ws)) availableAgents.add(agent);

    if (availableAgents.size === 0) {
      console.log(chalk.yellow("No agents configured in sync.config.js"));
      return;
    }
    selectedAgents = await askAgentSelection(Array.from(availableAgents));
  }

  const commonAgentsPath = path.join(syncDir, "agents-md", "common-agents.md");
  const commonAgents = fs.existsSync(commonAgentsPath)
    ? fs.readFileSync(commonAgentsPath, "utf-8") : "";

  const mainAgentsPath = path.join(syncDir, "agents-md", "main-agents.md");
  const mainAgents = fs.existsSync(mainAgentsPath)
    ? fs.readFileSync(mainAgentsPath, "utf-8") : "";

  const rawMcpContent = fs.existsSync(path.join(syncDir, "mcp.json"))
    ? fs.readFileSync(path.join(syncDir, "mcp.json"), "utf-8")
    : '{"mcpServers":{}}';
  const fullMcpConfig = JSON.parse(injectEnvVars(rawMcpContent));

  const processTarget = (
    targetDef: Record<string, AgentTarget>,
    targetPath: string,
    basePersona: string,
  ) => {
    for (const [agentName, agentConfig] of Object.entries(targetDef)) {
      if (selectedAgents.length > 0 && !selectedAgents.includes(agentName)) continue;
      const adapter = getAdapter(agentName);
      if (!adapter) {
        console.warn(chalk.yellow(`Warning: Unknown adapter for agent '${agentName}'`));
        continue;
      }
      let rulesContent = "";
      for (const ruleFile of agentConfig.rules) {
        const rulePath = path.join(syncDir, "agents-md", ruleFile);
        if (fs.existsSync(rulePath)) {
          rulesContent += `${fs.readFileSync(rulePath, "utf-8")}\n\n`;
        } else {
          console.warn(chalk.yellow(`Warning: Rule file ${ruleFile} not found.`));
        }
      }
      adapter.generate({
        agentName,
        targetPath,
        basePersona,
        rulesContent,
        mcpServers: fullMcpConfig.mcpServers || {},
        slashCommands,
        skillsSourceDir,
        writtenFiles,
      });
    }
  };

  const rootPersona = config.mergeCommonWithMain
    ? `${mainAgents}\n\n${commonAgents}`.trim() : mainAgents;

  console.log(chalk.blue("Processing root targets..."));
  processTarget(config.root, cwd, rootPersona);

  console.log(chalk.blue("Processing workspace targets..."));
  for (const [wsPath, wsDef] of Object.entries(config.workspaces)) {
    const wsName = path.basename(wsPath);
    const wsAgentFile = path.join(syncDir, "agents-md", `${wsName}-agents.md`);
    const wsPersona = fs.existsSync(wsAgentFile)
      ? `${commonAgents}\n\n${fs.readFileSync(wsAgentFile, "utf-8")}`.trim()
      : commonAgents;
    processTarget(wsDef, path.join(cwd, wsPath), wsPersona);
  }

  console.log(chalk.green("✓ Sync complete!"));
}
```

- [ ] **Step 2: Update interactive.ts** with all 9 agents

```typescript
// src/core/interactive.ts
import * as p from "@clack/prompts";
import type { SyncConfig } from "../types/schema.js";

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

export async function askInitConfig(existingConfig?: SyncConfig) {
  const group = await p.group(
    {
      agents: () =>
        p.multiselect({
          message: "Which agents are you using?",
          options: [
            { value: "cursor", label: "Cursor" },
            { value: "claude", label: "Claude Code" },
            { value: "gemini", label: "Gemini CLI" },
            { value: "roocode", label: "Roo Code" },
            { value: "kilocode", label: "Kilo Code" },
            { value: "windsurf", label: "Windsurf" },
            { value: "opencode", label: "OpenCode" },
            { value: "antigravity", label: "Google Antigravity" },
            { value: "copilot", label: "GitHub Copilot" },
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

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/commands/apply.ts src/core/interactive.ts
git commit -m "feat: wire all 9 adapters in apply.ts, update interactive agent list"
```

---

### Task 14: Full test run + build verification

- [ ] **Step 1: Run full test suite** — `pnpm test` — all tests PASS
- [ ] **Step 2: Run build** — `pnpm build` — no TypeScript errors
- [ ] **Step 3: Fix any lint issues** — `pnpm check`
