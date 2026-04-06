# AIAgentsSync

Universal compiler and manager for AI coding agent configurations.

## 🚀 Overview

AIAgentsSync is a Node.js CLI tool that acts as a central "source of truth" for managing multi-agent configurations (Cursor, Claude Code, Gemini CLI, etc.). It helps maintain consistent personas, rules, and MCP server configurations across project roots and monorepo workspaces.

## ✨ Features

- **Adapter Pattern**: Generates native config formats for various agents (`.cursorrules`, `.claude.json`, `.agents/`).
- **Workspace Support**: Distribute different rule sets to specific packages in a monorepo.
- **Environment Injection**: Dynamically inject secrets into MCP configs using `${VAR}` syntax and a local `.env.agent` file.
- **Zod Validation**: Ensures your `sync.config.ts` is always valid.
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
- `.ai-agents-sync/AGENTS.md`: Your base persona.
- `.ai-agents-sync/mcp.json`: Global MCP servers list.
- `.ai-agents-sync/rules/`: Folder for markdown rule sets.
- `.env.agent`: Local secrets (added to `.gitignore` automatically).

### 2. Configure

Edit `.ai-agents-sync/sync.config.js` to define which agents get which rules:

```javascript
export default {
  globalSettings: 'AGENTS.md',
  root: {
    cursor: { rules: ['default-rules.md'], mcpServers: [] },
    claude: { rules: ['default-rules.md'], mcpServers: ['github-mcp'] }
  },
  workspaces: {
    'apps/web': {
      cursor: { rules: ['frontend-rules.md'], mcpServers: [] }
    }
  }
};
```

### 3. Sync

Compile and distribute the configurations:

```bash
# Sync all agents
agentsync apply

# Sync specific agents
agentsync apply cursor claude
```

## 🧪 Testing & Development

```bash
# Run tests
pnpm test

# Lint with Biome
npx biome check src/

# Build
pnpm run build
```

## 🏗️ Architecture

- `src/cli.ts`: Entry point.
- `src/adapters/`: Logic for generating specific agent files.
- `src/core/`: Parser, Environment Injector, and Workspace logic.
- `src/types/`: Zod schemas and TypeScript interfaces.

---
Built with ❤️ for AI-native development.
