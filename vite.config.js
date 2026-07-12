import { defineConfig } from 'vite'

export default defineConfig(({ command })=>({
  root: command === 'serve' ? 'src/demo' : ".",
}));