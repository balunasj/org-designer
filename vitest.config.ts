import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/lib/**', 'src/store/**'],
        exclude: ['src/**/*.test.*', 'src/test/**'],
        thresholds: { lines: 80, branches: 70 },
      },
    },
  }),
)
