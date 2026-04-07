# Design: Workspace AGENTS.md Only, Demo Content on Init

> **Date:** 2026-04-07
> **Status:** Approved

## Overview

Refine agentsync behavior so workspaces only receive their own AGENTS.md (with workspace-specific rules), while all agent-specific files (skills, MCP, slash-commands) remain at project root only. Also add demo content prompt during init.

## Problem Statement

1. **Workspace agent files:** Currently, `apply.ts` generates full agent configs (skills dirs, MCP files, all adapters) inside each workspace directory. This is unnecessary — workspaces only need their own AGENTS.md with workspace-specific rules.

2. **Slash commands in AGENTS.md:** Slash commands are currently written into every generated AGENTS.md file, including workspace-level ones. They should only appear in root-level AGENTS.md.

3. **No demo content on init:** The init command doesn't offer to create sample content for users to get started.

## Design

### 1. Workspace AGENTS.md Only

**Change in `src/commands/apply.ts`:**

Modify `generateForAgents()` to accept options for what's included:

```typescript
interface GenerateOptions {
  includeSkills: boolean;
  includeMcp: boolean;
  includeSlashCommands: boolean;
}
```

- Root generation: `{ includeSkills: true, includeMcp: true, includeSlashCommands: true }`
- Workspace generation: `{ includeSkills: false, includeMcp: false, includeSlashCommands: false }`

**Implementation:** Pass these options to adapter's `generate()` method via `AdapterConfig`.

### 2. Slash Commands in Root-Only AGENTS.md

**Change in `src/adapters/BaseAdapter.ts`:**

Add `includeSlashCommands` to `AdapterConfig` interface:

```typescript
export interface AdapterConfig {
  // ... existing fields
  includeSlashCommands?: boolean;
}
```

In `buildContent()`, only append slash commands when `includeSlashCommands` is true:

```typescript
private buildContent(config: AdapterConfig): string {
  let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
  if (config.includeSlashCommands && config.slashCommands?.length > 0) {
    content += "\n\nAvailable Slash Commands:\n";
    for (const cmd of config.slashCommands) {
      content += `- /${cmd.name}: ${cmd.description}\n`;
    }
  }
  return content;
}
```

**Root vs Workspace behavior:**
- Root AGENTS.md: `includeSlashCommands: true`
- Workspace AGENTS.md: `includeSlashCommands: false`

### 3. Demo Content Prompt on Init

**Change in `src/commands/init.ts`:**

Add prompt after agent selection:

```typescript
const addDemo = await p.confirm({
  message: "Would you like to add demo content (skills, MCP, slash-commands)?",
  initialValue: true,
});
```

If yes, create:

1. **Demo skill:** `.ai-agents-sync/skills/demo-skill/README.md`
   ```markdown
   # Demo Skill
   
   This is a sample skill for demonstration.
   ```

2. **Demo slash command:** `.ai-agents-sync/slash-commands/demo.md`
   ```markdown
   # Demo Command
   
   This is a sample slash command for demonstration.
   ```

3. **Sample MCP:** Update `.ai-agents-sync/mcp.json` to include example: Add 2 examples one with command and another remote url based
   ```json
   {
     "mcpServers": {
       "demo-server": {
         "command": "npx",
         "args": ["-y", "demo-package"]
       }
     }
   }
   ```

4. Also add demo variables inside `.ai-agents-sync/.env.agents`: And currently its at root level move it inside .ai-agents-sync/.env.agents and add 2 demo variables also see changes where needed in codebase when applying with apply command. And use these variable in demo mcps above.
   ```json
   {
     "DEMO_API_KEY_1": "example_key_1",
     "DEMO_API_KEY_2": "example_key_2"
   }
   ```

## File Changes

| File | Change |
|------|--------|
| `src/types/schema.ts` | Add `includeSlashCommands` to `AdapterConfig` |
| `src/adapters/BaseAdapter.ts` | Update `buildContent()` to check flag |
| `src/commands/apply.ts` | Update `generateForAgents()` with options, pass to adapters |
| `src/commands/init.ts` | Add demo content prompt and file creation |

## Testing

- Add unit tests for workspace-only AGENTS.md generation
- Add test for slash commands exclusion in workspace context
- Add test for init demo content creation

## Notes

- Skills are never copied to workspaces — they only go to root
- MCP files are never copied to workspaces — they only go to root
- Each workspace gets its own AGENTS.md with workspace-specific persona and rules
- Demo content is optional — user chooses during init