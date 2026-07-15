import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // forks (not threads) because some tests use process.chdir(), unsupported in worker threads
        pool: 'forks',
        include: ['test/**/*.test.ts'],
    },
});
