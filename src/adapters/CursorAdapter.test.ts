import { describe, it, expect, vi, afterEach } from 'vitest';
import { CursorAdapter } from './CursorAdapter.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('CursorAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a .cursorrules file', () => {
    const adapter = new CursorAdapter();
    adapter.generate({
      agentName: 'cursor',
      targetPath: '/mock/path',
      basePersona: 'You are Cursor.',
      rulesContent: '- Do not break code.',
      mcpServers: {}
    });

    const expectedPath = path.join('/mock/path', '.cursorrules');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      'You are Cursor.\n\n- Do not break code.',
      'utf-8'
    );
  });
});
