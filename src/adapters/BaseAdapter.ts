import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { GitignoreManager } from "../utils/gitignore.js";
import type {
	AdapterCapabilities,
	AdapterConfig,
	AgentsFolderSupport,
} from "../types/schema.js";

export abstract class BaseAdapter {
	/** Path of the main output file, relative to targetPath (e.g. "CLAUDE.md") */
	abstract readonly outputFile: string;

	/** "json" wraps instructions in a JSON object; "text" writes plain/markdown */
	abstract readonly outputFormat: "json" | "text";

	/** Key used for instructions inside JSON output (unused for text format) */
	abstract readonly instructionsKey: string;

	/** Key used for MCP servers in output JSON */
	abstract readonly mcpKey: string;

	/**
	 * If non-null, MCP servers are written to this separate file relative to
	 * targetPath. If null and format is "json", MCP is embedded. If null and
	 * format is "text", no MCP written.
	 */
	abstract readonly mcpFile: string | null;

	/** Skills destination directory, relative to targetPath */
	abstract readonly skillDir: string;

	/**
	 * Top-level agent directory to gitignore (e.g. ".cursor"). null if no dir.
	 */
	abstract readonly agentDir: string | null;

	/**
	 * If false, the output file is committed (AGENTS.md, CLAUDE.md).
	 * If true, the output file/dir is gitignored.
	 */
	abstract readonly gitignoreOutputFile: boolean;

	abstract readonly agentsFolderSupport: AgentsFolderSupport;
	abstract readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"];

	get capabilities(): AdapterCapabilities {
		return {
			agentsFolderSupport: this.agentsFolderSupport,
			unsupportedFeatures: this.unsupportedFeatures,
		};
	}

	generate(config: AdapterConfig): void {
		const preExistingFiles = this.snapshotAgentDir(config.targetPath);

		const content = this.buildContent(config);
		this.writeOutput(config, content);
		this.copySkills(config);
		this.applyGitignore(config, preExistingFiles);

		console.log(
			chalk.green(
				`✓ Generated ${config.agentName} config at ${config.targetPath}`,
			),
		);
	}

	private snapshotAgentDir(targetPath: string): string[] {
		if (!this.agentDir) return [];
		const dirPath = path.join(targetPath, this.agentDir);
		if (!fs.existsSync(dirPath)) return [];
		return fs
			.readdirSync(dirPath, { withFileTypes: true })
			.filter((e) => e.isFile())
			.map((e) => path.join(this.agentDir as string, e.name));
	}

	private buildContent(config: AdapterConfig): string {
		let content = `${config.basePersona}\n\n${config.rulesContent}`.trim();
		if (config.slashCommands && config.slashCommands.length > 0) {
			content += "\n\nAvailable Slash Commands:\n";
			for (const cmd of config.slashCommands) {
				content += `- /${cmd.name}: ${cmd.description}\n`;
			}
		}
		return content;
	}

	private writeOutput(config: AdapterConfig, content: string): void {
		const outputPath = path.join(config.targetPath, this.outputFile);
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });

		// AGENTS.md deduplication: only write once per absolute path per run
		const isAgentsMd =
			path.basename(this.outputFile) === "AGENTS.md" &&
			this.outputFormat === "text";
		if (isAgentsMd) {
			if (config.writtenFiles.has(outputPath)) return;
			config.writtenFiles.add(outputPath);
		}

		if (this.outputFormat === "json") {
			const jsonOutput: Record<string, unknown> = {
				[this.instructionsKey]: content,
				[this.mcpKey]: config.mcpServers,
			};
			fs.writeFileSync(
				outputPath,
				JSON.stringify(jsonOutput, null, 2),
				"utf-8",
			);
		} else {
			fs.writeFileSync(outputPath, content, "utf-8");

			if (this.mcpFile !== null) {
				const mcpPath = path.join(config.targetPath, this.mcpFile);
				fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
				fs.writeFileSync(
					mcpPath,
					JSON.stringify({ [this.mcpKey]: config.mcpServers }, null, 2),
					"utf-8",
				);
			}
		}
	}

	private copySkills(config: AdapterConfig): void {
		if (!config.skillsSourceDir || !fs.existsSync(config.skillsSourceDir))
			return;

		const entries = fs.readdirSync(config.skillsSourceDir, {
			withFileTypes: true,
		});
		const skillDirs = entries.filter((e) => e.isDirectory());
		if (skillDirs.length === 0) return;

		const destSkillsDir = path.join(config.targetPath, this.skillDir);
		this.ensureDir(destSkillsDir);

		for (const skillEntry of skillDirs) {
			const srcDir = path.join(config.skillsSourceDir, skillEntry.name);
			const destDir = path.join(destSkillsDir, skillEntry.name);
			this.ensureDir(destDir);
			for (const file of fs.readdirSync(srcDir)) {
				fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
			}
		}
	}

	private applyGitignore(
		config: AdapterConfig,
		preExistingFiles: string[],
	): void {
		if (!this.gitignoreOutputFile) return;

		const gitignorePath = path.join(process.cwd(), ".gitignore");
		const manager = new GitignoreManager(gitignorePath);
		const cwd = process.cwd();

		if (this.agentDir) {
			const relDir = path.relative(
				cwd,
				path.join(config.targetPath, this.agentDir),
			);
			manager.ignore(`${relDir}/`);

			// Also ignore outputFile if it lives OUTSIDE agentDir
			if (!this.outputFile.startsWith(`${this.agentDir}/`)) {
				const relOutput = path.relative(
					cwd,
					path.join(config.targetPath, this.outputFile),
				);
				manager.ignore(relOutput);
			}
		} else {
			const relOutput = path.relative(
				cwd,
				path.join(config.targetPath, this.outputFile),
			);
			manager.ignore(relOutput);
		}

		// Negate pre-existing files so they stay committed
		for (const preExistingRelPath of preExistingFiles) {
			const relPath = path.relative(
				cwd,
				path.join(config.targetPath, preExistingRelPath),
			);
			manager.negate(relPath);
		}

		manager.flush();
	}

	protected ensureDir(dir: string) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}
}
