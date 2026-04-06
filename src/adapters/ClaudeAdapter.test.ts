import { describe, it, expect, vi, afterEach } from 'vitest';
import { ClaudeAdapter } from './ClaudeAdapter.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('ClaudeAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a .claude.json file with combined persona and rules', () => {
    const adapter = new ClaudeAdapter();
    adapter.generate({
      agentName: 'claude',
      targetPath: '/mock/path',
      basePersona: 'You are a helpful assistant.',
      rulesContent: '- Always write tests.',
      mcpServers: { testServer: { command: 'test' } }
    });

    const expectedPath = path.join('/mock/path', '.claude.json');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining('You are a helpful assistant.\\n\\n- Always write tests.'),
      'utf-8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining('"testServer"'),
      'utf-8'
    );
  });
});
