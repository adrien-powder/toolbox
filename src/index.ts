import { Command } from 'commander'
import dotenv from 'dotenv'
import { join, isAbsolute } from 'path'
import webpack from 'webpack'
import pkgDir from 'pkg-dir'
import { pathExists } from 'fs-extra'

import build from './commands/build'
import configure from './commands/configure'
import serve from './commands/serve'
import config from './webpack.config'

const resolvePathsFromEntryDirectory = async (directory: string): Promise<{ entryFilePath: string, applicationPath: string } | null> => {
  const entryDirPath = isAbsolute(directory)
    ? directory
    : join(process.cwd(), directory)
  const entryFilePath = join(entryDirPath, 'entry.yml')

  if (!await pathExists(entryFilePath)) {
    console.error(`Unable to find entry file. ${entryFilePath}`)
    return null
  }

  const applicationPath = await pkgDir(entryFilePath)

  if (!applicationPath) {
    console.error(`Unable to find application file.`)
    return null
  }

  return {
    entryFilePath,
    applicationPath
  }
}

const program = new Command()

program
  .command('build <directory>')
  .description('build')
  .option('--public-path <path>', 'webpack output.publicPath')
  .option('--output-path <path>', 'webpack output.path')
  .action(async (directory: string, options) => {
    const paths = await resolvePathsFromEntryDirectory(directory)

    if (!paths) {
      process.exit(1)
    }

    const { applicationPath, entryFilePath } = paths

    dotenv.config({
      path: join(applicationPath, '.env'),
    })

    const outputPath = options.outputPath || undefined
    const absoluteOutputPath = outputPath
      ? isAbsolute(outputPath)
        ? outputPath
        : join(process.cwd(), outputPath)
      : undefined

    const publicPath = options.publicPath || '/'

    const configuration = (await config(undefined, {
      mode: 'production',
      applicationPath,
      entryFilePath,
      publicPath,
      outputPath: absoluteOutputPath,
    })) as webpack.Configuration

    await build({ configuration })
  })

program
  .command('serve <directory>')
  .description('serve')
  .option('--public-path <path>', 'webpack output.publicPath')
  .action(async (directory: string, options) => {
    const paths = await resolvePathsFromEntryDirectory(directory)

    if (!paths) {
      process.exit(1)
    }

    const { applicationPath, entryFilePath } = paths

    dotenv.config({
      path: join(applicationPath, '.env'),
    })

    const publicPath = options.publicPath || '/'

    const configuration = (await config(undefined, {
      mode: 'development',
      applicationPath,
      entryFilePath,
      publicPath,
    })) as webpack.Configuration

    await serve({ configuration })
  })

program
  .command('configure <directory>')
  .description('generate configuration files')
  .action(async (directory: string) => {
    const paths = await resolvePathsFromEntryDirectory(directory)

    if (!paths) {
      process.exit(1)
    }

    const { applicationPath, entryFilePath } = paths

    dotenv.config({
      path: join(applicationPath, '.env'),
    })

    configure({ applicationPath, entryFilePath })
  })

program.parse(process.argv)
