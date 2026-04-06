import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { BaseAdapter } from './BaseAdapter.js';
import { AdapterConfig } from '../types/schema.js';

export class GeminiAdapter extends BaseAdapter {
  generate(config: AdapterConfig): void {
    const agentsDir = path.join(config.targetPath, '.agents');
    const customInstructions = `${config.basePersona}\n\n${config.rulesContent}`.trim();

    fs.mkdirSync(agentsDir, { recursive: true });
    
    fs.writeFileSync(path.join(agentsDir, 'AGENTS.md'), customInstructions, 'utf-8');
    
    if (Object.keys(config.mcpServers).length > 0) {
      fs.writeFileSync(
        path.join(agentsDir, 'mcp.json'),
        JSON.stringify({ mcpServers: config.mcpServers }, null, 2),
        'utf-8'
      );
    }
    
    console.log(chalk.green(`✓ Generated Gemini config at ${agentsDir}`));
  }
}
