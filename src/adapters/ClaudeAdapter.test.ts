import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeAdapter } from "./ClaudeAdapter.js";

vi.mock("fs");

describe("ClaudeAdapter", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("generates a .claude.json file with combined persona and rules", () => {
		const adapter = new ClaudeAdapter();
		adapter.generate({
			agentName: "claude",
			targetPath: "/mock/path",
			basePersona: "You are a helpful assistant.",
			rulesContent: "- Always write tests.",
			mcpServers: { testServer: { command: "test" } },
			slashCommands: [],
			skills: [],
		});

		const expectedPath = path.join("/mock/path", ".claude.json");
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expectedPath,
			expect.stringContaining(
				"You are a helpful assistant.\\n\\n- Always write tests.",
			),
			"utf-8",
		);
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expectedPath,
			expect.stringContaining('"testServer"'),
			"utf-8",
		);
	});

	it("generates a .claude.json file with slash commands in persona", () => {
		const adapter = new ClaudeAdapter();
		adapter.generate({
			agentName: "claude",
			targetPath: "/mock/path",
			basePersona: "You are Claude.",
			rulesContent: "- Write tests.",
			mcpServers: {},
			slashCommands: [
				{ name: "fix", description: "Fix code", content: "fix fix" },
			],
			skills: [],
		});

		const expectedPath = path.join("/mock/path", ".claude.json");
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expectedPath,
			expect.stringContaining("Available Slash Commands:\\n- /fix: Fix code"),
			"utf-8",
		);
	});

	it("reports no .agents support", () => {
		const adapter = new ClaudeAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("none");
		expect(adapter.capabilities.unsupportedFeatures).toContain("agents");
	});
});
