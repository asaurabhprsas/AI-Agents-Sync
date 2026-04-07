import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type {
	AdapterCapabilities,
	AdapterConfig,
	AgentsFolderSupport,
} from "../types/schema.js";

export abstract class BaseAdapter {
	/** Path of the main output file, relative to targetPath (e.g. ".claude.json") */
	abstract readonly outputFile: string;

	/** "json" wraps instructions in a JSON object; "text" writes plain/markdown */
	abstract readonly outputFormat: "json" | "text";

	/** Key used for instructions inside JSON output (e.g. "customInstructions") */
	abstract readonly instructionsKey: string;

	/** Key used for MCP servers in JSON output or in a separate mcp file */
	abstract readonly mcpKey: string;

	/**
	 * If non-null, MCP servers are written to this separate file relative to
	 * targetPath (e.g. "mcp.json").  If null and format is "json", they are
	 * embedded inside the main output file.  If null and format is "text",
	 * MCP is not written at all.
	 */
	abstract readonly mcpFile: string | null;

	/** Skills destination directory, relative to targetPath */
	abstract readonly skillDir: string;

	abstract readonly agentsFolderSupport: AgentsFolderSupport;
	abstract readonly unsupportedFeatures: AdapterCapabilities["unsupportedFeatures"];

	get capabilities(): AdapterCapabilities {
		return {
			agentsFolderSupport: this.agentsFolderSupport,
			unsupportedFeatures: this.unsupportedFeatures,
		};
	}

	generate(config: AdapterConfig): void {
		const content = this.buildContent(config);
		this.writeOutput(config.targetPath, content, config.mcpServers);

		if (config.skills && config.skills.length > 0) {
			this.copySkills(config.targetPath, config.skills);
		}

		this.applyGitignore(config);

		console.log(
			chalk.green(
				`✓ Generated ${config.agentName} config at ${config.targetPath}`,
			),
		);
	}

	// ─── private helpers ──────────────────────────────────────────────────────

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

	private writeOutput(
		targetPath: string,
		content: string,
		mcpServers: Record<string, unknown>,
	): void {
		const outputPath = path.join(targetPath, this.outputFile);
		fs.mkdirSync(path.dirname(outputPath), { recursive: true });

		if (this.outputFormat === "json") {
			// MCP always embedded when format is JSON
			const jsonOutput: Record<string, unknown> = {
				[this.instructionsKey]: content,
				[this.mcpKey]: mcpServers,
			};
			fs.writeFileSync(
				outputPath,
				JSON.stringify(jsonOutput, null, 2),
				"utf-8",
			);
		} else {
			fs.writeFileSync(outputPath, content, "utf-8");

			// Write separate MCP file when defined (always, even if empty)
			if (this.mcpFile !== null) {
				const mcpPath = path.join(targetPath, this.mcpFile);
				fs.writeFileSync(
					mcpPath,
					JSON.stringify({ [this.mcpKey]: mcpServers }, null, 2),
					"utf-8",
				);
			}
		}
	}

	private copySkills(
		targetPath: string,
		skills: { name: string; path: string }[],
	): void {
		const skillsDir = path.join(targetPath, this.skillDir);
		this.ensureDir(skillsDir);

		for (const skill of skills) {
			const destDir = path.join(skillsDir, skill.name);
			this.ensureDir(destDir);

			const skillFiles = fs.readdirSync(skill.path);
			for (const file of skillFiles) {
				const srcFile = path.join(skill.path, file);
				const destFile = path.join(destDir, file);
				fs.copyFileSync(srcFile, destFile);
			}
		}
	}

	/**
	 * Gitignore the output container (top-level dir for nested paths, or the
	 * file itself for flat ones), the skills dir if outside that container,
	 * and the separate MCP file when applicable.
	 */
	private applyGitignore(config: AdapterConfig): void {
		// Top-level gitignore target for the main output file
		const outputContainer = this.outputFile.includes("/")
			? this.outputFile.split("/")[0]
			: this.outputFile;
		this.updateGitignore(config.targetPath, outputContainer);

		// Skills dir — only if it falls outside the already-ignored container
		if (
			config.skills &&
			config.skills.length > 0 &&
			!this.skillDir.startsWith(outputContainer)
		) {
			this.updateGitignore(config.targetPath, this.skillDir);
		}

		// Separate MCP file
		if (this.mcpFile !== null) {
			this.updateGitignore(config.targetPath, this.mcpFile);
		}
	}

	protected ensureDir(dir: string) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	protected updateGitignore(targetPath: string, fileOrFolder: string) {
		const gitignorePath = path.join(process.cwd(), ".gitignore");
		const relativePath = path.relative(
			process.cwd(),
			path.join(targetPath, fileOrFolder),
		);

		if (fs.existsSync(gitignorePath)) {
			const content = fs.readFileSync(gitignorePath, "utf-8");
			if (!content.includes(relativePath)) {
				fs.appendFileSync(gitignorePath, `\n${relativePath}\n`, "utf-8");
			}
		}
	}
}
