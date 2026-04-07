import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WindsurfAdapter } from "./WindsurfAdapter.js";

vi.mock("fs");

describe("WindsurfAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "windsurf",
			targetPath: "/mock/path",
			basePersona: "You are Windsurf.",
			rulesContent: "- Surf with style.",
			mcpServers: { wind_server: {} },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md at project root", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new WindsurfAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "AGENTS.md"),
			"You are Windsurf.\n\n- Surf with style.",
			"utf-8",
		);
	});

	it("writes MCP to .windsurf/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new WindsurfAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".windsurf/mcp.json"),
			expect.stringContaining('"wind_server"'),
			"utf-8",
		);
	});

	it("deduplicates AGENTS.md across adapters sharing writtenFiles", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new WindsurfAdapter();
		const writtenFiles = new Set<string>();
		adapter.generate(makeConfig({ writtenFiles }));
		adapter.generate(makeConfig({ writtenFiles }));

		const agentsMdCalls = vi
			.mocked(fs.writeFileSync)
			.mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
		expect(agentsMdCalls).toHaveLength(1);
	});

	it("reports partial .agents support", () => {
		const adapter = new WindsurfAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
	});
});
