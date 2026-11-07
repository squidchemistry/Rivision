import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    test: {
        environment: 'node',
        // *.db.test.ts need a migrated Postgres (DATABASE_URL); run them with `npm run test:db`
        include: ['tests/**/*.test.ts'],
        exclude: process.env.TEST_DB ? [] : ['tests/**/*.db.test.ts'],
        fileParallelism: false,
        testTimeout: 20_000,
    },
});
