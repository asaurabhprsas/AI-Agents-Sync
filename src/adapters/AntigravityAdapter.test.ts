// src/adapters/AntigravityAdapter.test.ts
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AntigravityAdapter } from "./AntigravityAdapter.js";

vi.mock("fs");

describe("AntigravityAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "antigravity",
			targetPath: "/mock/path",
			basePersona: "You are Antigravity.",
			rulesContent: "- Defy gravity.",
			mcpServers: { ag_server: {} },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md inside .gemini/antigravity/", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new AntigravityAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".gemini/antigravity/AGENTS.md"),
			"You are Antigravity.\n\n- Defy gravity.",
			"utf-8",
		);
	});

	it("writes MCP to .gemini/antigravity/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new AntigravityAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".gemini/antigravity/mcp.json"),
			expect.stringContaining('"ag_server"'),
			"utf-8",
		);
	});

	it("reports partial .agents support", () => {
		const adapter = new AntigravityAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
	});
});
