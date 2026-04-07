import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitignoreManager } from "./gitignore.js";

vi.mock("fs");

describe("GitignoreManager", () => {
	afterEach(() => vi.restoreAllMocks());

	it("adds a new entry when it does not exist", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue("node_modules/\n");
		const manager = new GitignoreManager("/project/.gitignore");
		manager.ignore(".cursor/");
		manager.flush();
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			"/project/.gitignore",
			"node_modules/\n.cursor/\n",
			"utf-8",
		);
	});

	it("does not add a duplicate entry", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue("node_modules/\n.cursor/\n");
		const manager = new GitignoreManager("/project/.gitignore");
		manager.ignore(".cursor/");
		manager.flush();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it("adds a negation entry to preserve a pre-existing file", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(".gemini/\n");
		const manager = new GitignoreManager("/project/.gitignore");
		manager.negate(".gemini/config.json");
		manager.flush();
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			"/project/.gitignore",
			".gemini/\n!.gemini/config.json\n",
			"utf-8",
		);
	});

	it("does not add a duplicate negation entry", () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(
			".gemini/\n!.gemini/config.json\n",
		);
		const manager = new GitignoreManager("/project/.gitignore");
		manager.negate(".gemini/config.json");
		manager.flush();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it("creates .gitignore if it does not exist", () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const manager = new GitignoreManager("/project/.gitignore");
		manager.ignore(".cursor/");
		manager.flush();
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			"/project/.gitignore",
			".cursor/\n",
			"utf-8",
		);
	});
});
