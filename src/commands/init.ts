import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function initCommand() {
  const cwd = process.cwd();
  const syncDir = path.join(cwd, '.ai-agents-sync');
  
  if (fs.existsSync(syncDir)) {
    console.log(chalk.yellow('.ai-agents-sync directory already exists.'));
    return;
  }

  fs.mkdirSync(syncDir, { recursive: true });
  fs.mkdirSync(path.join(syncDir, 'rules'), { recursive: true });
  fs.mkdirSync(path.join(syncDir, 'skills'), { recursive: true });

  const envAgentPath = path.join(cwd, '.env.agent');
  if (!fs.existsSync(envAgentPath)) {
    fs.writeFileSync(envAgentPath, '# Add your agent secrets here\n# GITHUB_TOKEN=\n', 'utf-8');
  }

  fs.writeFileSync(path.join(syncDir, 'AGENTS.md'), '# Base Persona\nYou are an expert developer.\n', 'utf-8');
  fs.writeFileSync(path.join(syncDir, 'rules', 'default-rules.md'), '- Write clean code.\n- Add tests.\n', 'utf-8');
  fs.writeFileSync(path.join(syncDir, 'mcp.json'), '{\n  "mcpServers": {}\n}\n', 'utf-8');

  const configContent = `
export default {
  globalSettings: 'AGENTS.md',
  root: {
    cursor: { rules: ['default-rules.md'], mcpServers: [] },
    claude: { rules: ['default-rules.md'], mcpServers: [] }
  },
  workspaces: {}
};
`.trim();

  fs.writeFileSync(path.join(syncDir, 'sync.config.js'), configContent, 'utf-8');

  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.env.agent')) {
      fs.appendFileSync(gitignorePath, '\n.env.agent\n', 'utf-8');
    }
  } else {
    fs.writeFileSync(gitignorePath, '.env.agent\n', 'utf-8');
  }

  console.log(chalk.green('✓ Initialized .ai-agents-sync directory structure.'));
}
