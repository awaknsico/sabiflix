import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'jsdom',
    // Vite 8 requires Node ^22.12; on Node 20 Vitest exits 1 with "No test
    // files found" even though the suite exists. Fail loudly instead.
    passWithNoTests: false,
    // Only our own test suite. The globs below also keep Vitest out of
    // vendored packages (e.g. the git-ignored clerk-nextjs/ sandbox) whose
    // published source ships its own failing *.test.ts files.
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '.next/**',
      '.open-next/**',
      'dist/**',
      'playwright-report/**',
      'clerk-nextjs/**',
      'tests/e2e/**',
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      // Report over everything that can actually be unit tested (lib/ holds the
      // schemas, repositories, auth and helpers the tests exercise). App Router
      // routes/components are covered by Playwright instead.
      include: ['lib/**/*.{ts,tsx}', 'proxy.ts'],
      exclude: ['**/*.d.ts', 'lib/db/schema.ts'],
      // No thresholds yet: the suite covers the core (validations, auth,
      // envelope) but most of lib/ (repositories, youtube, watchlist) is still
      // untested, and an uncovered file counts as 0%, so any project-wide floor
      // fails on day one. Coverage is collected and published as a report; once
      // the repositories are covered, add thresholds here (e.g. lines 70,
      // functions 70, branches 60, statements 70).
      reporter: ['text', 'json', 'html'],
    },
  },
})