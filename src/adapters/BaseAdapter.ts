import fs from "node:fs";
import path from "node:path";
import type { AdapterCapabilities, AdapterConfig } from "../types/schema.js";

export abstract class BaseAdapter {
	abstract capabilities: AdapterCapabilities;

	abstract generate(config: AdapterConfig): void;

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
