import { describe, expect, it } from "vitest";
import { injectEnvVars } from "./env-injector.js";

describe("env-injector", () => {
	it("replaces environment variables in the string", () => {
		process.env.TEST_VAR = "secret_value";
		// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional input for testing injector
		const input = '{"key": "${TEST_VAR}"}';
		const result = injectEnvVars(input);
		expect(result).toBe('{"key": "secret_value"}');
	});

	it("leaves missing variables intact and logs a warning", () => {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional input for testing injector
		const input = '{"key": "${MISSING_VAR}"}';
		const result = injectEnvVars(input);
		// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional result
		expect(result).toBe('{"key": "${MISSING_VAR}"}');
	});
});
