# AIAgentsSync

Universal compiler and manager for AI coding agent configurations.

## 🚀 Overview

AIAgentsSync is a Node.js CLI tool that acts as a central "source of truth" for managing multi-agent configurations (Cursor, Claude Code, Gemini CLI, etc.). It helps maintain consistent personas, rules, and MCP server configurations across project roots and monorepo workspaces.

## ✨ Features

- **Adapter Pattern**: Generates native config formats for various agents (`.cursorrules`, `.claude.json`, `.agents/`).
- **Interactive CLI**: Multi-select agents to sync using a modern terminal UI.
- **Workspace Support**: Distribute different rule sets to specific packages in a monorepo.
- **Persona Merging**: Combine global personas with package-specific instructions.
- **Slash Commands**: Define custom `/command` descriptions for your agents.
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
agentsync init
```

This creates:
- `.ai-agents-sync/sync.config.js`: The master routing configuration.
- `.ai-agents-sync/main-agents.md`: Your root persona.
- `.ai-agents-sync/common-agents.md`: Common persona for all packages.
- `.ai-agents-sync/mcp.json`: Global MCP servers list.
- `.ai-agents-sync/agents-instruction/`: Folder for markdown rule sets.
- `.env.agent`: Local secrets (added to `.gitignore` automatically).

### 2. Configure

Edit `.ai-agents-sync/sync.config.js` to define which agents get which rules. The `root` object handles your main project directory, and `workspaces` handles your sub-packages.

```javascript
export default {
  mergeCommonWithMain: true,
  root: {
    cursor: { 
      rules: ['default-rules.md'], 
      mcpServers: [], 
      slashCommands: [{ command: 'fix', description: 'Fix the bug in current file' }] 
    },
    claude: { rules: ['default-rules.md'], mcpServers: ['github-mcp'] }
  },
  workspaces: {
    'apps/web': {
      cursor: { rules: ['frontend-rules.md'], mcpServers: [] },
      gemini: { rules: ['frontend-rules.md'], mcpServers: [] }
    },
    'packages/shared': {
       cursor: { rules: ['library-rules.md'], mcpServers: [] }
    }
  }
};
```

#### Persona Merging Logic
- **Root**: Uses `main-agents.md`. If `mergeCommonWithMain` is true, it appends `common-agents.md`.
- **Workspaces**: Uses `common-agents.md`. If a file named `[packageName]-agents.md` exists in `.ai-agents-sync/` (where packageName is the folder name), it appends its content.

### 3. Sync

Compile and distribute the configurations:

```bash
# Sync using interactive multi-select
agentsync apply

# Sync specific agents (non-interactive)
agentsync apply cursor claude
```

## 📦 Monorepo Setup (pnpm/Yarn/Lerna)

AIAgentsSync is designed with monorepos in mind. It allows you to:
1.  **Avoid Token Bloat**: Send only package-specific rules to the AI agent based on the workspace path.
2.  **Centralized Personas**: Keep a single `common-agents.md` persona at the root, while varying technical rules per package.
3.  **Local Context**: AI agents operating inside `apps/web` will automatically see the generated `.cursorrules` or `.claude.json` specific to that directory.

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
