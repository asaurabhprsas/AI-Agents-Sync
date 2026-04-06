import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { BaseAdapter } from './BaseAdapter.js';
import { AdapterConfig } from '../types/schema.js';

export class ClaudeAdapter extends BaseAdapter {
  generate(config: AdapterConfig): void {
    const outputPath = path.join(config.targetPath, '.claude.json');
    
    const customInstructions = `${config.basePersona}\n\n${config.rulesContent}`.trim();
    
    const claudeConfig = {
      customInstructions,
      mcpServers: config.mcpServers
    };

    fs.mkdirSync(config.targetPath, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(claudeConfig, null, 2), 'utf-8');
    
    console.log(chalk.green(`✓ Generated Claude config at ${outputPath}`));
  }
}
