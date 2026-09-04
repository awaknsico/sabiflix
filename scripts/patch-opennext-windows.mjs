import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

if (process.platform !== 'win32') process.exit(0)

const file = resolve('node_modules/@opennextjs/aws/dist/build/copyTracedFiles.js')
if (!existsSync(file)) process.exit(0)

const source = readFileSync(file, 'utf8')
const before = 'symlinkSync(symlink, to);'
const after = "symlinkSync(symlink, to, statSync(from).isDirectory() ? 'junction' : 'file');"

if (source.includes(after)) process.exit(0)
if (!source.includes(before)) {
  throw new Error(`OpenNext patch target was not found: ${file}`)
}

writeFileSync(file, source.replace(before, after), 'utf8')
console.log('Patched OpenNext traced directory links for Windows junctions.')