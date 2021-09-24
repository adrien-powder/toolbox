import { Command } from 'commander'
import dotenv from 'dotenv'
import { join, isAbsolute } from 'path'
import webpack from 'webpack'

import build from './commands/build'
import configure from './commands/configure'
import serve from './commands/serve'
import config from './webpack.config'

const program = new Command()

program
  .command('build <directory>')
  .description('build')
  .option('--public-path <path>', 'webpack output.publicPath')
  .option('--output-path <path>', 'webpack output.path')
  .action(async (directory: string, options) => {
    const applicationPath = isAbsolute(directory)
      ? directory
      : join(process.cwd(), directory)

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
    const applicationPath = isAbsolute(directory)
      ? directory
      : join(process.cwd(), directory)

    dotenv.config({
      path: join(applicationPath, '.env'),
    })

    const publicPath = options.publicPath || '/'

    const configuration = (await config(undefined, {
      mode: 'development',
      applicationPath,
      publicPath,
    })) as webpack.Configuration

    await serve({ configuration })
  })

program
  .command('configure <directory>')
  .description('generate configuration files')
  .action((directory: string) => {
    const applicationPath = isAbsolute(directory)
      ? directory
      : join(process.cwd(), directory)

    dotenv.config({
      path: join(applicationPath, '.env'),
    })

    configure({ applicationPath })
  })

program.parse(process.argv)
