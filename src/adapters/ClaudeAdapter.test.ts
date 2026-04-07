import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAdapter } from "./ClaudeAdapter.js";

vi.mock("fs");

describe("ClaudeAdapter", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function makeConfig(overrides = {}) {
		return {
			agentName: "claude",
			targetPath: "/mock/path",
			basePersona: "You are a helpful assistant.",
			rulesContent: "- Always write tests.",
			mcpServers: { testServer: { command: "test" } },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("generates a CLAUDE.md file with combined persona and rules", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new ClaudeAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "CLAUDE.md"),
			"You are a helpful assistant.\n\n- Always write tests.",
			"utf-8",
		);
	});

	it("generates a CLAUDE.md file with slash commands in content", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new ClaudeAdapter();
		adapter.generate(
			makeConfig({
				basePersona: "You are Claude.",
				rulesContent: "- Write tests.",
				mcpServers: {},
				slashCommands: [
					{ name: "fix", description: "Fix code", content: "fix fix" },
				],
			}),
		);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", "CLAUDE.md"),
			expect.stringContaining("Available Slash Commands:\n- /fix: Fix code"),
			"utf-8",
		);
	});

	it("does not gitignore CLAUDE.md", () => {
		const adapter = new ClaudeAdapter();
		expect(adapter.gitignoreOutputFile).toBe(false);
	});

	it("reports partial .agents support", () => {
		const adapter = new ClaudeAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("partial");
	});
});
