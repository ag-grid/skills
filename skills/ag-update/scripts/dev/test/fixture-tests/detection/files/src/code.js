export function useGrid(grid, config) {
    const removed = grid.oldGridApi();
    const hyphenated = config['Foo-Bar'];
    const embedded = new FooBar();
    return [removed, hyphenated, embedded];
}
