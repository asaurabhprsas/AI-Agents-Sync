import { describe, expect, it } from "vitest";
import {
	AgentTargetSchema,
	SyncConfigSchema,
	type AdapterConfig,
} from "./schema.js";

describe("Schema", () => {
	it("AgentTargetSchema should parse correctly with rules", () => {
		const data = {
			rules: ["rule1"],
		};
		const result = AgentTargetSchema.parse(data);
		expect(result.rules).toContain("rule1");
	});

	it("SyncConfigSchema should parse correctly with new structure", () => {
		const data = {
			defaultAgents: ["opencode", "gemini"],
			root: {
				rules: ["default-rules.md"],
			},
			workspaces: {
				"apps/web": {
					rules: ["frontend-rules.md"],
				},
			},
		};
		const result = SyncConfigSchema.parse(data);
		expect(result.defaultAgents).toContain("opencode");
		expect(result.defaultAgents).toContain("gemini");
		expect(result.root?.rules).toContain("default-rules.md");
		expect(result.workspaces["apps/web"]?.rules).toContain("frontend-rules.md");
	});

	it("AdapterConfig should allow optional include fields", () => {
		const config: AdapterConfig = {
			agentName: "test-agent",
			targetPath: "/test/path",
			basePersona: "test persona",
			rulesContent: "test rules",
			mcpServers: {},
			slashCommands: [],
			skillsSourceDir: "/test/skills",
			writtenFiles: new Set(),
			includeSkills: false,
			includeMcp: false,
			includeSlashCommands: false,
		};
		expect(config.includeSkills).toBe(false);
		expect(config.includeMcp).toBe(false);
		expect(config.includeSlashCommands).toBe(false);
	});
});
