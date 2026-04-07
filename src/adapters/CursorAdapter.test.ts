import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorAdapter } from "./CursorAdapter.js";

vi.mock("fs");

describe("CursorAdapter", () => {
	afterEach(() => vi.restoreAllMocks());

	function makeConfig(overrides = {}) {
		return {
			agentName: "cursor",
			targetPath: "/mock/path",
			basePersona: "You are Cursor.",
			rulesContent: "- Do not break code.",
			mcpServers: { cursor_mcp: { command: "run" } },
			slashCommands: [],
			skillsSourceDir: "/mock/.ai-agents-sync/skills",
			writtenFiles: new Set<string>(),
			...overrides,
		};
	}

	it("generates a .cursorrules file", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new CursorAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".cursorrules"),
			"You are Cursor.\n\n- Do not break code.",
			"utf-8",
		);
	});

	it("writes MCP to .cursor/mcp.json", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new CursorAdapter();
		adapter.generate(makeConfig());

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".cursor/mcp.json"),
			expect.stringContaining('"cursor_mcp"'),
			"utf-8",
		);
	});

	it("generates a .cursorrules file with slash commands in content", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const adapter = new CursorAdapter();
		adapter.generate(
			makeConfig({
				slashCommands: [
					{ name: "bug", description: "Fix bug", content: "fix fix" },
				],
			}),
		);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			path.join("/mock/path", ".cursorrules"),
			expect.stringContaining("Available Slash Commands:\n- /bug: Fix bug"),
			"utf-8",
		);
	});

	it("reports no .agents support", () => {
		const adapter = new CursorAdapter();
		expect(adapter.capabilities.agentsFolderSupport).toBe("none");
		expect(adapter.capabilities.unsupportedFeatures).toContain("agents");
	});
});
