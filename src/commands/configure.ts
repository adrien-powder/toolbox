import { outputFile, pathExists } from 'fs-extra'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { read as readEntry } from '../parsers/entry'

interface Options {
  applicationPath: string
  entryFilePath: string
}

const configure = async ({ applicationPath, entryFilePath }: Options) => {
  const entry = await readEntry(entryFilePath)

  const variables = entry.configuration

  // typings
  const typingsPath = entryFilePath + '.configuration.d.ts'
  const typingsContent =
    '/**\n'+
    ' * NOTE: THIS IS AN AUTO-GENERATED FILE. DO NOT MODIFY IT DIRECTLY.\n'+
    ' */\n\n'+
    variables
      .map(
        ({ name, type }) =>
          `export const ${name}: Readonly<${type} | undefined>\n`
      )
      .join('') +
    '\n'
  await outputFile(typingsPath, typingsContent)

  // readme
  const readmePath = join(applicationPath, 'README.md')

  if (await pathExists(readmePath)) {
    const readmeContent = await readFile(readmePath, { encoding: 'utf-8' })

    const beginIndex = readmeContent.indexOf(MARKDOWN_BEGIN)
    const endIndex = readmeContent.indexOf(MARKDOWN_END)

    if (endIndex > beginIndex) {
      const b = readmeContent.substring(0, beginIndex)
      const e = readmeContent.substring(endIndex)

      const doc = variables
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

      await outputFile(readmePath, b + MARKDOWN_BEGIN + '\n' + doc + e)
    }
  }

  // Show cfg to user
  // eslint-disable-next-line no-console
  console.log(variables)
}

const MARKDOWN_BEGIN = '<!-- entry.configuration:begin -->'
const MARKDOWN_END = '<!-- entry.configuration:end -->'

export default configure
