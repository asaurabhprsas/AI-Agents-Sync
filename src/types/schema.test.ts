import { describe, expect, it } from "vitest";
import { AgentTargetSchema, SyncConfigSchema } from "./schema.js";

describe("Schema", () => {
	it("AgentTargetSchema should NOT include slashCommands", () => {
		const data = {
			rules: ["rule1"],
			mcpServers: ["server1"],
			slashCommands: [{ command: "test", description: "test" }],
		};
		const result = AgentTargetSchema.parse(data);
		expect(result).not.toHaveProperty("slashCommands");
	});

	it("SyncConfigSchema should parse correctly", () => {
		const data = {
			root: {
				main: {
					rules: ["rule1"],
				},
			},
		};
		const result = SyncConfigSchema.parse(data);
		expect(result.root.main.rules).toContain("rule1");
	});
});
