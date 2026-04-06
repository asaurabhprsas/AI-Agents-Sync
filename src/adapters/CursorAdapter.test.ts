import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CursorAdapter } from "./CursorAdapter.js";

vi.mock("fs");

describe("CursorAdapter", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("generates a .cursorrules file", () => {
		const adapter = new CursorAdapter();
		adapter.generate({
			agentName: "cursor",
			targetPath: "/mock/path",
			basePersona: "You are Cursor.",
			rulesContent: "- Do not break code.",
			mcpServers: {},
		});

		const expectedPath = path.join("/mock/path", ".cursorrules");
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expectedPath,
			"You are Cursor.\n\n- Do not break code.",
			"utf-8",
		);
	});
});
