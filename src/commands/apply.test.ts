import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../core/parser.js", () => ({
	loadConfig: vi.fn(),
}));

vi.mock("../core/interactive.js", () => ({
	askAgentSelection: vi.fn(),
}));

import { applyCommand } from "./apply.js";
import { ClaudeAdapter } from "../adapters/ClaudeAdapter.js";
import { loadConfig } from "../core/parser.js";

describe("applyCommand include options", () => {
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
			path.join(syncDir, "agents-md", "main-agents.md"),
			"# Main Agents\nYou are a main agent.",
		);
		fs.writeFileSync(
			path.join(syncDir, "agents-md", "default-rules.md"),
			"# Default Rules\nBe helpful.",
		);

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

	it("passes include options to adapter for root generation", async () => {
		await applyCommand(["claude"]);

		expect(generateSpy).toHaveBeenCalled();
		const call = generateSpy.mock.calls[0][0];
		expect(call.includeSkills).toBe(true);
		expect(call.includeMcp).toBe(true);
		expect(call.includeSlashCommands).toBe(true);
	});

	it("passes limited include options to adapter for workspace generation", async () => {
		await applyCommand(["claude"]);

		const calls = generateSpy.mock.calls;
		const workspaceCall = calls.find(
			(call) => call[0].targetPath === path.join(tempDir, "packages/pkg1"),
		);

		expect(workspaceCall).toBeDefined();
		if (!workspaceCall) return;
		expect(workspaceCall[0].includeSkills).toBe(false);
		expect(workspaceCall[0].includeMcp).toBe(false);
		expect(workspaceCall[0].includeSlashCommands).toBe(false);
	});
});
