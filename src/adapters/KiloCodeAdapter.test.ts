import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KiloCodeAdapter } from "./KiloCodeAdapter.js";

vi.mock("fs");

describe("KiloCodeAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "kilocode",
			targetPath: "/mock/path",
			basePersona: "You are KiloCode.",
			rulesContent: "- Be precise.",
			mcpServers: { kilo_server: {} },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md at project root", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new KiloCodeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "AGENTS.md"),
			"You are KiloCode.\n\n- Be precise.",
			"utf-8",
		);
	});

	it("writes MCP to .kilocode/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new KiloCodeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".kilocode/mcp.json"),
			expect.stringContaining('"kilo_server"'),
			"utf-8",
		);
	});

	it("deduplicates AGENTS.md when writtenFiles already has it", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new KiloCodeAdapter();
		const writtenFiles = new Set<string>();
		adapter.generate(makeConfig({ writtenFiles }));
		adapter.generate(makeConfig({ writtenFiles }));

		const agentsMdCalls = vi
			.mocked(fs.writeFileSync)
			.mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
		expect(agentsMdCalls).toHaveLength(1);
	});

	it("reports full .agents support", () => {
		const adapter = new KiloCodeAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("full");
	});
});
