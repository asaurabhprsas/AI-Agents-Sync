import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../core/parser.js", () => ({
	loadConfig: vi.fn(),
}));

vi.mock("../core/env-injector.js", () => ({
	injectEnvVars: vi.fn((content) => content),
}));

import { applyCommand } from "./apply.js";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { loadConfig } from "../core/parser.js";

describe("applyCommand workspace behavior", () => {
	let tempDir: string;
	let generateSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "apply-command-test-"));

		const syncDir = path.join(tempDir, ".ai-agents-sync");
		fs.mkdirSync(syncDir);
		fs.mkdirSync(path.join(syncDir, "agents-md"));
		fs.mkdirSync(path.join(syncDir, "slash-commands"));
		fs.mkdirSync(path.join(syncDir, "skills"));

		fs.writeFileSync(
			path.join(syncDir, "agents-md", "common-agents.md"),
			"# Common Rules\nYou are a common agent.",
		);
		fs.writeFileSync(
			path.join(syncDir, "agents-md", "main-agents.md"),
			"# Main Agents\nYou are a main agent.",
		);
		fs.writeFileSync(
			path.join(syncDir, "agents-md", "default-rules.md"),
			"# Default Rules\nBe helpful.",
		);
		fs.writeFileSync(path.join(syncDir, "mcp.json"), '{"mcpServers":{}}');

		vi.mocked(loadConfig).mockResolvedValue({
			defaultAgents: ["claude"],
			root: { rules: ["default-rules.md"] },
			workspaces: {
				"packages/pkg1": { rules: ["default-rules.md"] },
			},
			mergeCommonWithMain: false,
		});

		process.chdir(tempDir);
		generateSpy = vi.spyOn(ClaudeAdapter.prototype, "generate");
	});

	afterEach(() => {
		process.chdir("/");
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("calls adapter.generate() for root with full include options", async () => {
		await applyCommand([]);

		expect(generateSpy).toHaveBeenCalled();
		const call = generateSpy.mock.calls[0][0];
		expect(call.targetPath).toBe(tempDir);
		expect(call.includeSkills).toBe(true);
		expect(call.includeMcp).toBe(true);
		expect(call.includeSlashCommands).toBe(true);
	});

	it("does NOT call adapter.generate() for workspaces", async () => {
		await applyCommand([]);

		const calls = generateSpy.mock.calls;
		const workspaceCalls = calls.filter(
			(call: unknown[]) =>
				(call[0] as { targetPath: string }).targetPath ===
				path.join(tempDir, "packages/pkg1"),
		);

		expect(workspaceCalls).toHaveLength(0);
	});

	it("writes AGENTS.md directly for workspaces", async () => {
		await applyCommand([]);

		const workspaceAgentsMd = path.join(tempDir, "packages/pkg1", "AGENTS.md");
		expect(fs.existsSync(workspaceAgentsMd)).toBe(true);
		const content = fs.readFileSync(workspaceAgentsMd, "utf-8");
		expect(content).toContain("You are a common agent.");
		expect(content).toContain("Be helpful.");
	});
});
