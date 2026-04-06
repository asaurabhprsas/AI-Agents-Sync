# AIAgentsSync - Gemini Project Context

## Project Overview
AIAgentsSync is a universal compiler and manager for AI coding agent configurations. It centralizes the management of personas (`main-agents.md`, `common-agents.md`), rules (`agents-instruction/`), and MCP server lists across project roots and monorepo workspaces.

### Core Technologies
- **Runtime**: Node.js (v18+ with ESM support)
- **Language**: TypeScript
- **CLI Framework**: [Commander](https://github.com/tj/commander.js) & [@clack/prompts](https://github.com/natemoo-re/clack) (Interactivity)
- **Validation**: [Zod](https://zod.dev/)
- **Build Tool**: [tsup](https://tsup.egoist.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Linting/Formatting**: [Biome](https://biomejs.dev/)

### Architecture
- **Adapter Pattern**: Generates agent-specific configuration files (Gemini, Claude, Cursor).
- **Command Engine**: 
  - `init`: Scaffolds the `.ai-agents-sync` source-of-truth directory with the new structure.
  - `apply`: Loads configuration, merges personas, processes slash commands, and distributions configs. Supports interactive multi-select for agents.
- **Persona Merging**: 
  - Root: `main-agents.md` (+ `common-agents.md` if `mergeCommonWithMain` is true).
  - Workspaces: `common-agents.md` + `[packageName]-agents.md` (if exists).
- **Slash Commands**: Define custom `/command` descriptions in the sync config.

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
pnpm run lint
pnpm run format
pnpm run check

# Run in watch mode for development
pnpm run dev
```

### Usage (Local)
```bash
# Initialize a project
node dist/cli.js init

# Apply configurations (Interactive if no args)
node dist/cli.js apply [agents...]
```

---

## Development Conventions

### Code Style
- Adhere to [Biome](https://biomejs.dev/) standards.
- Use **ESM natively** (always include `.js` extensions in imports).
- Use `import type` for type-only imports.

### Configuration Management
- Source folder: `.ai-agents-sync/`
- Root persona: `main-agents.md`
- Common persona: `common-agents.md`
- Instructions: `agents-instruction/*.md`

### Testing
- Maintain corresponding `.test.ts` files.
- Ensure `slashCommands` and new schema fields are represented in test mocks.
