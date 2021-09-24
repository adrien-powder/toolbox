/* eslint-disable no-console */
import webpack from 'webpack'

interface Options {
  configuration: webpack.Configuration
}

const build = async ({ configuration }: Options) => {
  configuration.plugins = [
    ...(configuration.plugins || []),
    new webpack.ProgressPlugin(function (percentage, msg) {
      console.log((percentage * 100).toFixed(2) + '%', msg)
    }),
  ]

  return new Promise(() => {
    webpack(configuration, (error?: Error, stats?: webpack.Stats) => {
      if (error) {
        console.error(error)
        process.exit(1)
        return
      }

      console.log(
        stats?.toString({
          colors: true,
        })
      )

      if (stats?.hasErrors()) {
        process.exit(1)
        return
      }

      console.log('Done !')
      process.exit(0)
    })
  })
}

export default build
