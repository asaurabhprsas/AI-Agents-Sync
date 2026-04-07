# AIAgentsSync

Universal compiler and manager for AI coding agent configurations.

## 🚀 Overview

AIAgentsSync is a Node.js CLI tool that acts as a central "source of truth" for managing multi-agent configurations (Cursor, Claude Code, Gemini CLI, etc.). It helps maintain consistent personas, rules, and MCP server configurations across project roots and monorepo workspaces.

## ✨ Features

- **Adapter Pattern**: Generates native config formats for various agents (`.cursorrules`, `CLAUDE.md`, `AGENTS.md`, etc.).
- **Adapter Capabilities**: Each adapter declares its support for `.agents` folder (full, partial, or none) and features (MCP, skills, slash-commands).
- **Interactive CLI**: All commands use modern terminal UI with `@clack/prompts`.
- **Workspace Support**: Distribute different rule sets to specific packages in a monorepo.
- **Persona Merging**: Combine global personas with package-specific instructions.
- **Slash Commands as Files**: Define custom commands as markdown files in `slash-commands/`.
- **Skills Support**: Copy skill directories to agent-specific output locations.
- **Environment Injection**: Dynamically inject secrets into MCP configs using `${VAR}` syntax and a local `.env.agent` file.
- **Zod Validation**: Ensures your configuration is always valid.
- **Biome Integrated**: Fast linting and formatting.

## 🛠️ Installation

```bash
pnpm install
pnpm run build
pnpm link --global
```

## 📖 Usage

### 1. Initialize

Scaffold the `.ai-agents-sync` directory in your project root:

```bash
.ai-agents-sync/
├── agents-md/           # Agent-specific markdown files
│   ├── main-agents.md
│   ├── common-agents.md
│   └── [workspace]-agents.md
├── slash-commands/      # Command definitions as .md files
│   └── [command-name].md
├── skills/              # Skill definitions
├── mcp.json             # MCP servers configuration
└── sync.config.json     # Routing configuration
```

This creates the new structure:

```
.ai-agents-sync/
├── agents-md/           # Agent-specific markdown files
│   ├── main-agents.md
│   ├── common-agents.md
│   └── [workspace]-agents.md
├── slash-commands/      # Command definitions as .md files
│   └── [command-name].md
├── skills/              # Skill definitions
├── mcp.json             # MCP servers configuration
└── sync.config.json     # Routing configuration
```

### Interactive Mode

The init command is interactive - you'll be prompted to:
- Select which agents to use (Cursor, Claude, Gemini)
- Choose whether to merge common-agents.md with main-agents.md

### Update Configuration

Update an existing configuration:

```bash
agentsync init --update
# or
agentsync init -u
```

This will prompt you to modify the existing config while creating a backup.

### 2. Configure

Edit `.ai-agents-sync/sync.config.json` to define which agents and rules to use:

```json
{
  "mergeCommonWithMain": true,
  "defaultAgents": ["opencode", "gemini", "cursor"],
  "root": {
    "rules": ["default-rules.md"]
  },
  "workspaces": {
    "apps/web": {
      "rules": ["frontend-rules.md"]
    },
    "packages/shared": {
      "rules": ["library-rules.md"]
    }
  }
}
```

#### Persona Merging Logic
- **Root**: Uses `main-agents.md`. If `mergeCommonWithMain` is true, it appends `common-agents.md`.
- **Workspaces**: Uses `common-agents.md`. If a file named `[packageName]-agents.md` exists in `.ai-agents-sync/`, it appends its content.

### 3. Sync

Compile and distribute the configurations:

```bash
# Sync using interactive multi-select
agentsync apply

# Sync specific agents (non-interactive)
agentsync apply cursor claude
```

### Slash Commands

Create slash commands as markdown files in `.ai-agents-sync/slash-commands/`:

```markdown
# Fix Bug
Analyze the current file and fix any bugs you can find.
```

The command name comes from the filename (e.g., `fix-bug.md` creates `/fix-bug`).

## Adapter Capabilities

Each adapter declares its support for different features:

| Adapter  | .agents Folder | MCP  | Skills | Slash Commands |
|----------|---------------|------|--------|----------------|
| Claude   | partial       | ✅   | ✅     | ✅ |
| Cursor   | none          | ✅   | ✅     | ✅ |
| Gemini   | partial       | ✅   | ✅     | ✅ |
| Roo Code | full          | ✅   | ✅     | ✅ |
| Kilo Code| full          | ✅   | ✅     | ✅ |
| Windsurf | partial       | ✅   | ✅     | ✅ |
| OpenCode | partial       | ✅   | ✅     | ✅ |
| Antigravity| partial     | ✅   | ✅     | ✅ |
| Copilot  | none          | ❌   | ✅     | ✅ |

*Claude outputs `CLAUDE.md` instead of using `.claude.json`
*Roocode/KiloCode support full .agents folder (their config goes inside .roo/ or .kilocode/)
*Windsurf outputs AGENTS.md at root and .windsurf/mcp.json
*OpenCode merges MCP into opencode.json under "mcp" key
*Antigravity outputs to .gemini/antigravity/ directory
*Copilot has no MCP support

## 📦 Monorepo Setup (pnpm/Yarn/Lerna)

AIAgentsSync is designed with monorepos in mind:
1. **Avoid Token Bloat**: Send only package-specific rules to the AI agent.
2. **Centralized Personas**: Keep a single `common-agents.md` at the root.
3. **Local Context**: AI agents in `apps/web` get generated `.cursorrules` or `CLAUDE.md` specific to that directory.

## 🧪 Testing & Development

```bash
# Run tests
pnpm test

# Lint & Format
pnpm run lint
pnpm run format
pnpm run check

# Build
pnpm run build
```

---
Built with ❤️ for AI-native development.
