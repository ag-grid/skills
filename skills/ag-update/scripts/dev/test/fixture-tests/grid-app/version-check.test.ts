import { afterEach, expect, test } from 'vitest';
import { runCli } from '../../../src/main';
import { render } from '../../../src/output';
import { RELEASED_VERSION_URL } from '../../../src/skill-version';
import {
    expectExitWithError,
    globalTestStateReset,
    mockHttpFailure,
    mockHttpResponse,
    portable,
    requestedUrls,
    serveChangelogs,
} from '../../utils';
import { FIXTURE, gridChangelog } from './fixture';

afterEach(globalTestStateReset);

test('command exits early if newer skill available', async () => {
    mockHttpResponse(RELEASED_VERSION_URL, '99.0.0');
    const output = await expectExitWithError(runCli('--root', FIXTURE));
    expect(portable(render(output))).toMatchInlineSnapshot(`
      "ERROR: a new version of this skill is available. Current version $VERSION$; new version 99.0.0.

      Tell the user that they are recommended to update the skill by running \`npx skills update ag-grid/skills\`, but alternatively may choose to continue running this outdated version.

      Stop and wait for the user to respond. If they ask to continue using this version, invoke the script again adding the --allow-old-version argument.
      "
    `);
});

test('--allow-old-version skips version check', async () => {
    mockHttpResponse(RELEASED_VERSION_URL, '99.0.0'); // would trigger the ERROR if consulted
    serveChangelogs({ grid: gridChangelog() });
    const output = await runCli('--root', FIXTURE, '--allow-old-version');
    expect(output.status).toBe('SUCCESS');
    expect(requestedUrls()).not.toContain(RELEASED_VERSION_URL);
});

test('version fetch failure yields the NOTICE and the run continues', async () => {
    mockHttpFailure(RELEASED_VERSION_URL);
    serveChangelogs({ grid: gridChangelog() });
    const output = await runCli('--root', FIXTURE);
    expect(output.status).toBe('SUCCESS');
    expect(portable(output.notices.join('\n'))).toMatchInlineSnapshot(`"currently using ag-update v$VERSION$, could not fetch https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md to check if a newer version exists"`);
    // notices render at the bottom of the output
    expect(render(output).trimEnd().split('\n\n').at(-1)).toMatch(/^NOTICE: /);
});
