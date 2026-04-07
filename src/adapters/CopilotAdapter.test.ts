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
