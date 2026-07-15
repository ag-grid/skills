/** Shared setup for the grid-app fixture: a repo with one React grid project on v32.1.0 ("app",
 *  whose src/main.js calls the removed oldGridApi) and one project with no AG dependencies ("lib"). */
import type { CompiledChangelog } from '../../../src/types';
import { changelog, fixtureFiles, mitigation, simpleChange, transition } from '../../utils';

export const FIXTURE = fixtureFiles(import.meta.url);

export function gridChangelog(): CompiledChangelog {
    return changelog({
        mostRecentVersion: '34.0.0',
        changes: [
            transition({
                oldApi: 'oldGridApi',
                detectWords: ['oldGridApi'],
                removedFrom: '33.0.0',
                mitigation: [mitigation('Replace calls to `oldGridApi()` with `api.newGridApi()`.')],
            }),
            simpleChange('behaviour', {
                version: '34.0.0',
                detectWords: null,
                title: 'rows are now sorted stably by default',
            }),
        ],
    });
}
