import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { BaseAdapter } from './BaseAdapter.js';
import { AdapterConfig } from '../types/schema.js';

export class CursorAdapter extends BaseAdapter {
  generate(config: AdapterConfig): void {
    const outputPath = path.join(config.targetPath, '.cursorrules');
    
    const content = `${config.basePersona}\n\n${config.rulesContent}`.trim();

    fs.mkdirSync(config.targetPath, { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');
    
    console.log(chalk.green(`✓ Generated Cursor config at ${outputPath}`));
  }
}
