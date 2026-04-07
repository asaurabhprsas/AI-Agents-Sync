import { describe, expect, it } from "vitest";
import { AgentTargetSchema, SyncConfigSchema } from "./schema.js";

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
});
