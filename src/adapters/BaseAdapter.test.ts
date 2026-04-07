import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { BaseAdapter } from "./BaseAdapter.js";
import type {
	AdapterConfig,
	AdapterCapabilities,
	AgentsFolderSupport,
} from "../types/schema.js";

const _TEMP_DIR = path.join(os.tmpdir(), `base-adapter-test-${Date.now()}`);

class TestAdapter extends BaseAdapter {
	readonly outputFile = "TEST.md";
	readonly outputFormat: "json" | "text" = "text";
	readonly instructionsKey = "instructions";
	readonly mcpKey = "mcpServers";
	readonly mcpFile = "test-mcp.json";
	readonly skillDir = ".test-skills";
	readonly agentDir = ".test-agent";
	readonly gitignoreOutputFile = true;
	readonly agentsFolderSupport: AgentsFolderSupport = "full";
	readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"] = [];

	generate(config: AdapterConfig): void {
		super.generate(config);
	}
}

describe("BaseAdapter include options", () => {
	let tempDir: string;
	let skillsSourceDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "base-adapter-test-"));

		skillsSourceDir = path.join(tempDir, "skills-source");
		fs.mkdirSync(skillsSourceDir);
		fs.mkdirSync(path.join(skillsSourceDir, "test-skill"));
		fs.writeFileSync(
			path.join(skillsSourceDir, "test-skill", "skill.md"),
			"# Test Skill",
		);
	});

	describe("includeSlashCommands", () => {
		it("includes slash commands by default", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: {},
				slashCommands: [
					{ name: "hello", description: "Say hello", content: "Hello!" },
				],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: true,
				includeMcp: true,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const outputPath = path.join(tempDir, "TEST.md");
			expect(fs.existsSync(outputPath)).toBe(true);
			const content = fs.readFileSync(outputPath, "utf-8");
			expect(content).toContain("/hello");
			expect(content).toContain("Say hello");
		});

		it("excludes slash commands when includeSlashCommands is false", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: {},
				slashCommands: [
					{ name: "hello", description: "Say hello", content: "Hello!" },
				],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: true,
				includeMcp: true,
				includeSlashCommands: false,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const outputPath = path.join(tempDir, "TEST.md");
			expect(fs.existsSync(outputPath)).toBe(true);
			const content = fs.readFileSync(outputPath, "utf-8");
			expect(content).not.toContain("/hello");
			expect(content).not.toContain("Slash Commands");
		});
	});

	describe("includeSkills", () => {
		it("copies skills by default", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: {},
				slashCommands: [],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: true,
				includeMcp: true,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const destSkillDir = path.join(tempDir, ".test-skills", "test-skill");
			expect(fs.existsSync(destSkillDir)).toBe(true);
			expect(fs.existsSync(path.join(destSkillDir, "skill.md"))).toBe(true);
		});

		it("does not copy skills when includeSkills is false", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: {},
				slashCommands: [],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: false,
				includeMcp: true,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const destSkillDir = path.join(tempDir, ".test-skills", "test-skill");
			expect(fs.existsSync(destSkillDir)).toBe(false);
		});
	});

	describe("includeMcp", () => {
		it("writes MCP file by default", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: { "test-server": { command: "npx", args: ["test"] } },
				slashCommands: [],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: true,
				includeMcp: true,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const mcpPath = path.join(tempDir, "test-mcp.json");
			expect(fs.existsSync(mcpPath)).toBe(true);
			const mcpContent = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
			expect(mcpContent.mcpServers).toHaveProperty("test-server");
		});

		it("does not write MCP file when includeMcp is false", () => {
			const config: AdapterConfig = {
				agentName: "test-agent",
				targetPath: tempDir,
				basePersona: "You are a test agent.",
				rulesContent: "Rule 1: Be helpful.",
				mcpServers: { "test-server": { command: "npx", args: ["test"] } },
				slashCommands: [],
				skillsSourceDir,
				writtenFiles: new Set<string>(),
				includeSkills: true,
				includeMcp: false,
			};

			const adapter = new TestAdapter();
			adapter.generate(config);

			const mcpPath = path.join(tempDir, "test-mcp.json");
			expect(fs.existsSync(mcpPath)).toBe(false);
		});
	});
});
