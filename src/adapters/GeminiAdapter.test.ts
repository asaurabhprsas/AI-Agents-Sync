import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeminiAdapter } from './GeminiAdapter.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('GeminiAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates .agents structure for Gemini', () => {
    const adapter = new GeminiAdapter();
    adapter.generate({
      agentName: 'gemini',
      targetPath: '/mock/path',
      basePersona: 'You are Gemini.',
      rulesContent: '- Be helpful.',
      mcpServers: { server1: {} }
    });

    const agentsPath = path.join('/mock/path', '.agents');
    expect(fs.mkdirSync).toHaveBeenCalledWith(agentsPath, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(agentsPath, 'AGENTS.md'),
      'You are Gemini.\n\n- Be helpful.',
      'utf-8'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(agentsPath, 'mcp.json'),
      expect.stringContaining('"server1"'),
      'utf-8'
    );
  });
});
