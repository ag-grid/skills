/** Whole-fetch interception by URL. Importing this module (via the utils index, which every test
 *  file imports) replaces global fetch, so no test can hit the real network: fetching a URL with
 *  no registered mock fails loudly. Even the hardcoded VERSION.md URL is controllable this way,
 *  without any test-only argument. */

const routes = new Map<string, () => Promise<Response>>();
const requested: string[] = [];

globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    requested.push(url);
    const route = routes.get(url);
    if (!route) {
        throw new Error(`no mock registered for fetch of ${url} — register it with mockHttpResponse/mockHttpFailure`);
    }
    return route();
};

/** Serves `response` for fetches of exactly `url`. A string becomes a 200 text response. */
export function mockHttpResponse(url: string, response: string | Response): void {
    routes.set(url, () => Promise.resolve(typeof response === 'string' ? new Response(response) : response));
}

/** Makes fetches of exactly `url` reject like a network failure. */
export function mockHttpFailure(url: string): void {
    routes.set(url, () => Promise.reject(new TypeError('fetch failed')));
}

/** Every URL fetched since the last reset, in order. */
export function requestedUrls(): string[] {
    return [...requested];
}

export function resetFetchMock(): void {
    routes.clear();
    requested.length = 0;
}
