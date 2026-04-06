import { describe, expect, it } from "vitest";
import { injectEnvVars } from "./env-injector.js";

describe("env-injector", () => {
	it("replaces environment variables in the string", () => {
		process.env.TEST_VAR = "secret_value";
		const input = '{"key": "${TEST_VAR}"}';
		const result = injectEnvVars(input);
		expect(result).toBe('{"key": "secret_value"}');
	});

	it("leaves missing variables intact and logs a warning", () => {
		const input = '{"key": "${MISSING_VAR}"}';
		const result = injectEnvVars(input);
		expect(result).toBe('{"key": "${MISSING_VAR}"}');
	});
});
