import * as esbuild from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('api', { recursive: true })

await esbuild.build({
  entryPoints: ['server/agentHandler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'api/agent-bundle.cjs',
  logLevel: 'info',
})

console.log('API bundle written to api/agent-bundle.cjs')
