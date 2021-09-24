import { outputFile } from 'fs-extra'
import { readFile } from 'fs/promises'
import { join } from 'path'

import { read as readCfg } from '../parsers/cfg'

interface Options {
  applicationPath: string
}

const configure = async ({ applicationPath }: Options) => {
  const cfgPath = join(applicationPath, 'cfg.yml')
  const cfg = await readCfg(cfgPath)

  // typings
  const typingsPath = join(applicationPath, 'typings/cfg.d.ts')
  const typingsContent =
    `declare module 'cfg' {\n` +
    cfg.variables
      .map(
        ({ name, type }) =>
          `  export const ${name}: Readonly<${type} | undefined>\n`
      )
      .join('') +
    `}\n`
  await outputFile(typingsPath, typingsContent)

  // readme
  const readmePath = join(applicationPath, 'README.md')
  const readmeContent = await readFile(readmePath, { encoding: 'utf-8' })

  const beginIndex = readmeContent.indexOf('<!-- cfg:begin -->')
  const endIndex = readmeContent.indexOf('<!-- cfg:end -->')

  if (endIndex > beginIndex) {
    const b = readmeContent.substring(0, beginIndex)
    const e = readmeContent.substring(endIndex)

    const doc = cfg.variables
      .map(({ name, type, default: d }) => {
        const attr: string[] = [type]

        if (d) {
          attr.push('default: ' + d)
        }

        return `- \`${name}\`${
          attr.length > 0 ? ` (${attr.join(', ')})` : ''
        } \n`
      })
      .join('')

    await outputFile(readmePath, b + '<!-- cfg:begin -->\n' + doc + e)
  }

  // Show cfg to user
  // eslint-disable-next-line no-console
  console.log(cfg)
}

export default configure
