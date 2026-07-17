export function useGrid(grid, config) {
    const removed = grid.oldGridApi();
    const hyphenated = config['Foo-Bar'];
    const embedded = new FooBar();
    const special = element.$scope.$apply();
    return [removed, hyphenated, embedded, special];
}
