/* eslint-disable no-console */
import express from 'express'
import { join } from 'path'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'

interface Options {
  configuration: webpack.Configuration
}

const serve = async ({ configuration }: Options) => {
  const port = 8080

  configuration.plugins = [
    ...(configuration.plugins || []),
    new webpack.HotModuleReplacementPlugin(),
  ]

  const compiler = webpack(configuration)

  const app = express()

  app.use(
    webpackDevMiddleware(compiler, {
      serverSideRender: true,
    })
  )

  app.use((req, res) => {
    const { devMiddleware } = res.locals.webpack
    const outputFileSystem = devMiddleware.outputFileSystem
    const jsonWebpackStats = devMiddleware.stats.toJson()
    const { outputPath } = jsonWebpackStats

    const t = req.accepts('html')

    if (t) {
      res
        .type(t)
        .send(outputFileSystem.readFileSync(join(outputPath, 'index.html')))
    } else {
      res.status(404).send()
    }
  })

  app.listen(port, () => console.log(`Application served on port ${port}.`))
}

export default serve
