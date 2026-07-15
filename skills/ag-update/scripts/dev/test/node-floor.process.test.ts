import { afterEach, expect, test } from 'vitest';
import { globalTestStateReset, mockCurrentNodeVersion, portable, runCompiled } from './utils';

afterEach(globalTestStateReset);

// Slow: `npx -y node@18` downloads Node 18 on a cold cache.
test('under npx node@18, the script exits immediately with the minimum-Node message', { timeout: 300_000 }, () => {
    mockCurrentNodeVersion('v18.0.0');
    const result = runCompiled(['--allow-old-version'], { nodeVersion: '18' });
    expect(portable(result)).toMatchInlineSnapshot(`
      "exitCode: 1
      stderr:
      ERROR: minimum Node.js 20 version required (current version = v18.0.0)
      "
    `);
});
