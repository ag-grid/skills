import { afterEach, expect, test } from 'vitest';
import { globalTestStateReset, portable, runCompiled } from './utils';

afterEach(globalTestStateReset);

// Slow: `npx -y node@18` downloads Node 18 on a cold cache.
test('under npx node@18, the script exits immediately with the minimum-Node message', { timeout: 300_000 }, () => {
    const result = runCompiled(['--allow-old-version'], { nodeVersion: '18' });
    expect(portable(result)).toMatchInlineSnapshot(`
      "exitCode: 1
      stderr:
      ERROR: minimum Node.js 20 version required (current version = $NODE_VERSION$)
      "
    `);
});
