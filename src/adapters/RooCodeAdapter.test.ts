import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RooCodeAdapter } from "./RooCodeAdapter.js";

vi.mock("fs");

describe("RooCodeAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "roocode",
			targetPath: "/mock/path",
			basePersona: "You are RooCode.",
			rulesContent: "- Follow the rules.",
			mcpServers: { roo_server: {} },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md inside .roo/", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new RooCodeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".roo/AGENTS.md"),
			"You are RooCode.\n\n- Follow the rules.",
			"utf-8",
		);
	});

	it("writes MCP to .roo/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new RooCodeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".roo/mcp.json"),
			expect.stringContaining('"roo_server"'),
			"utf-8",
		);
	});

	it("reports full .agents support", () => {
		const adapter = new RooCodeAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("full");
	});
});
