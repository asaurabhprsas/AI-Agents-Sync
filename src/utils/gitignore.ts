import fs from "node:fs";

export class GitignoreManager {
	private lines: string[];
	private dirty = false;

	constructor(private readonly gitignorePath: string) {
		if (fs.existsSync(gitignorePath)) {
			const raw = fs.readFileSync(gitignorePath, "utf-8") as string;
			this.lines = raw.split("\n");
			if (this.lines[this.lines.length - 1] === "") {
				this.lines.pop();
			}
		} else {
			this.lines = [];
		}
	}

	/** Add a gitignore entry (e.g. ".cursor/") if not already present. */
	ignore(entry: string): void {
		if (!this.lines.includes(entry)) {
			this.lines.push(entry);
			this.dirty = true;
		}
	}

	/** Add a negation entry (e.g. "!.gemini/config.json") if not already present. */
	negate(entry: string): void {
		const neg = `!${entry}`;
		if (!this.lines.includes(neg)) {
			this.lines.push(neg);
			this.dirty = true;
		}
	}

	/** Write changes to disk only if any entries were added. */
	flush(): void {
		if (!this.dirty) return;
		fs.writeFileSync(this.gitignorePath, `${this.lines.join("\n")}\n`, "utf-8");
	}
}
