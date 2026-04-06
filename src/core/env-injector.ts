import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'path';

// Load .env.agent from the current working directory
config({ path: path.resolve(process.cwd(), '.env.agent') });

export function injectEnvVars(content: string): string {
  return content.replace(/\$\{([A-Z0-9_]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value !== undefined) {
      return value;
    }
    console.warn(chalk.yellow(`Warning: Environment variable ${varName} not found in .env.agent or process.env`));
    return match;
  });
}
