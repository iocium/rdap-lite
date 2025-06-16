import { spawnSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve(__dirname, '../dist/cli.js');

describe('CLI', () => {
  test('shows help with no arguments', () => {
    const result = spawnSync('node', [cliPath], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: rdap-lite <domain\|ip>/);
  });

  test('shows help with --help flag', () => {
    const result = spawnSync('node', [cliPath, '--help'], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: rdap-lite <domain\|ip>/);
  });

  test('errors on invalid input', () => {
    const result = spawnSync('node', [cliPath, 'notvalid'], { encoding: 'utf-8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/❌ Error: Input must be a valid domain or IP address/);
  });
});