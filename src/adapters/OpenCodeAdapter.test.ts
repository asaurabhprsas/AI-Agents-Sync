import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenCodeAdapter } from "./OpenCodeAdapter.js";

vi.mock("fs");

describe("OpenCodeAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "opencode",
			targetPath: "/mock/path",
			basePersona: "You are OpenCode.",
			rulesContent: "- Use superpowers.",
			mcpServers: { oc_server: { type: "local", command: "run" } },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("writes AGENTS.md at project root", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new OpenCodeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "AGENTS.md"),
			"You are OpenCode.\n\n- Use superpowers.",
			"utf-8",
		);
	});

	it("merges MCP into existing opencode.json under mcp key", () => {
		vi.mocked(fs.existsSync).mockImplementation((p) =>
			String(p).endsWith("opencode.json"),
		);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			if (String(p).endsWith("opencode.json")) {
				return JSON.stringify({ theme: "dark", model: "gpt-4" });
			}
			return "";
		});

		const adapter = new OpenCodeAdapter();
		adapter.generate(makeConfig());

		const call = vi
			.mocked(fs.writeFileSync)
			.mock.calls.find(([p]) => String(p).endsWith("opencode.json"));
		expect(call).toBeDefined();
		const written = JSON.parse(call![1] as string);
		expect(written.theme).toBe("dark");
		expect(written.model).toBe("gpt-4");
		expect(written.mcp).toEqual({
			oc_server: { type: "local", command: "run" },
		});
	});

	it("creates opencode.json when it does not exist", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new OpenCodeAdapter();
		adapter.generate(makeConfig());

		const call = vi
			.mocked(fs.writeFileSync)
			.mock.calls.find(([p]) => String(p).endsWith("opencode.json"));
		expect(call).toBeDefined();
		const written = JSON.parse(call![1] as string);
		expect(written.mcp).toEqual({
			oc_server: { type: "local", command: "run" },
		});
	});

	it("deduplicates AGENTS.md", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new OpenCodeAdapter();
		const writtenFiles = new Set<string>();
		adapter.generate(makeConfig({ writtenFiles }));
		adapter.generate(makeConfig({ writtenFiles }));

		const agentsMdCalls = vi
			.mocked(fs.writeFileSync)
			.mock.calls.filter(([p]) => String(p).endsWith("AGENTS.md"));
		expect(agentsMdCalls).toHaveLength(1);
	});

	it("reports partial .agents support", () => {
		const adapter = new OpenCodeAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
	});
});
