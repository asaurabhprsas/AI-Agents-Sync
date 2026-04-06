# AIAgentsSync - Gemini Project Context

## Project Overview
AIAgentsSync is a universal compiler and manager for AI coding agent configurations. It centralizes the management of personas (`AGENTS.md`), rules (`.cursorrules`, `.claude.json`), and MCP server lists across project roots and monorepo workspaces.

### Core Technologies
- **Runtime**: Node.js (v18+ with ESM support)
- **Language**: TypeScript
- **CLI Framework**: [Commander](https://github.com/tj/commander.js)
- **Validation**: [Zod](https://zod.dev/)
- **Build Tool**: [tsup](https://tsup.egoist.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Linting/Formatting**: [Biome](https://biomejs.dev/)

### Architecture
- **Adapter Pattern**: An abstract `BaseAdapter` defines the interface for generating agent-specific configuration files. Concrete adapters exist for Gemini (`.agents/`), Claude (`.claude.json`), and Cursor (`.cursorrules`).
- **Command Engine**: 
  - `init`: Scaffolds the `.ai-agents-sync` source-of-truth directory.
  - `apply`: Loads `sync.config.ts`, injects environment variables, filters MCP servers, and invokes adapters to distribute configs.
- **Core Utilities**: 
  - `env-injector`: Replaces `${VAR}` placeholders in configs with values from `.env.agent`.
  - `parser`: Loads and validates the user's sync configuration using Zod.

---

## Building and Running

### Setup
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Development
```bash
# Run tests
pnpm test

# Run linting/formatting checks
npx biome check src/

# Run in watch mode for development
pnpm run dev
```

### Usage (Local)
```bash
# Initialize a project
node dist/cli.js init

# Apply configurations
node dist/cli.js apply [agents...]
```

---

## Development Conventions

### Code Style
- Adhere to [Biome](https://biomejs.dev/) standards for formatting and linting.
- Use **ESM natively** (always include `.js` extensions in imports).
- Prefer **strict typing** and avoid `any` where possible (use `unknown` or explicit interfaces).

### Configuration Management
- User configurations are stored in `.ai-agents-sync/sync.config.js` (or `.ts`).
- Secrets must never be committed; use `.env.agent` for local variable injection.

### Testing
- Every new feature or adapter must have a corresponding `.test.ts` file in its directory.
- Use `vi.mock` for filesystem operations in tests to keep them fast and isolated.

### Adding New Adapters
1. Create a new class in `src/adapters/` extending `BaseAdapter`.
2. Implement the `generate(config: AdapterConfig): void` method.
3. Register the new adapter in `src/commands/apply.ts` within the `getAdapter` function.
