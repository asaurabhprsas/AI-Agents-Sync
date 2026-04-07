import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("../core/interactive.js", () => ({
	askInitConfig: vi.fn().mockResolvedValue({
		agents: ["claude"],
		mergeCommon: false,
	}),
}));

vi.mock("@clack/prompts", async () => {
	const actual = await vi.importActual("@clack/prompts");
	return {
		...actual,
		confirm: vi.fn().mockResolvedValue(true),
		isCancel: vi.fn().mockReturnValue(false),
	};
});

import { initCommand } from "./init.js";

describe("initCommand demo content", () => {
	let tempDir: string;

	beforeEach(() => {
		vi.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-demo-test-"));
		process.chdir(tempDir);
	});

	afterEach(() => {
		process.chdir("/");
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it("creates demo content when user confirms", async () => {
		await initCommand();

		const syncDir = path.join(tempDir, ".ai-agents-sync");

		expect(
			fs.existsSync(path.join(syncDir, "skills", "demo-skill", "README.md")),
		).toBe(true);
		expect(fs.existsSync(path.join(syncDir, "slash-commands", "demo.md"))).toBe(
			true,
		);
		expect(fs.existsSync(path.join(syncDir, "mcp.json"))).toBe(true);
		expect(fs.existsSync(path.join(syncDir, ".env.agents"))).toBe(true);
	});

	it("does not create demo content when user declines", async () => {
		const p = await import("@clack/prompts");
		p.confirm = vi.fn().mockResolvedValue(false);

		await initCommand();

		const syncDir = path.join(tempDir, ".ai-agents-sync");

		expect(fs.existsSync(path.join(syncDir, "skills", "demo-skill"))).toBe(
			false,
		);
		expect(fs.existsSync(path.join(syncDir, "slash-commands", "demo.md"))).toBe(
			false,
		);
	});

	it("updates gitignore with .env.agents", async () => {
		fs.writeFileSync(path.join(tempDir, ".gitignore"), "node_modules\n");

		await initCommand();

		const gitignore = fs.readFileSync(
			path.join(tempDir, ".gitignore"),
			"utf-8",
		);
		expect(gitignore).toContain(".env.agents");
	});
});
