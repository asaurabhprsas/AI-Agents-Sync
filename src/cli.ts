#!/usr/bin/env node

import { Command } from "commander";
import { applyCommand } from "./commands/apply.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
	.name("agentsync")
	.description(
		"Universal compiler and manager for AI coding agent configurations",
	)
	.version("1.0.0");

program
	.command("init")
	.description("Scaffold the .ai-agents-sync directory")
	.action(() => {
		initCommand();
	});

program
	.command("apply")
	.description("Compile and sync configurations to targets")
	.argument(
		"[agents...]",
		"Specific agents to sync (e.g., claude cursor). Syncs all if empty.",
	)
	.action(async (agents) => {
		await applyCommand(agents);
	});

program.parse(process.argv);
