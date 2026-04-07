import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiAdapter } from "./GeminiAdapter.js";

vi.mock("fs");

describe("GeminiAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "gemini",
			targetPath: "/mock/path",
			basePersona: "You are Gemini.",
			rulesContent: "- Be helpful.",
			mcpServers: { server1: {} },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md at root with persona and rules", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new GeminiAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "AGENTS.md"),
			"You are Gemini.\n\n- Be helpful.",
			"utf-8",
		);
	});

	it("writes MCP to .gemini/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new GeminiAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".gemini/mcp.json"),
			expect.stringContaining('"server1"'),
			"utf-8",
		);
	});

	it("does not write AGENTS.md twice to the same path", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new GeminiAdapter();
		const writtenFiles = new Set<string>();
		adapter.generate(makeConfig({ writtenFiles }));
		adapter.generate(makeConfig({ writtenFiles }));

		const agentsMdCalls = vi
			.mocked(fs.writeFileSync)
			.mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
		expect(agentsMdCalls).toHaveLength(1);
	});

	it("reports partial .agents support", () => {
		const adapter = new GeminiAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
	});
});
