import { resolve, join } from 'path'
import webpack from 'webpack'

import { readSync as readCfgSync } from './lib/cfg'
import { Entry, read as readEntry } from './lib/entry'
import EntryMetaPlugin from './plugins/entry-meta'

const HtmlWebpackPlugin = require('html-webpack-plugin')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const { EnvironmentPlugin, DefinePlugin } = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')

export default async (
  env: any,
  {
    mode,
    applicationPath,
    publicPath,
    outputPath,
  }: {
    mode: webpack.Configuration['mode']
    publicPath: string
    applicationPath: string
    outputPath?: string
  }
): Promise<webpack.Configuration> => {
  const isProduction = mode === 'production'
  const entryDir = './src/entry'
  const entryFilePath = resolve(applicationPath, entryDir, 'entry.yml')
  const entry = await readEntry(entryFilePath)
  const outputBuildPath = outputPath || join(applicationPath, 'dist')
  const outputAssetsPath = join(outputBuildPath, 'public')
  const faviconPath = entry.favicon

  const cfg = {
    mode,
    entry: entry.main,
    output: {
      publicPath,
      path: outputAssetsPath,
      filename: '[name].[chunkhash:8].js',
      chunkFilename: '[id].chunk.[chunkhash:8].js',
    },
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.tsx?$/,
              use: {
                loader: 'ts-loader',
                options: {
                  onlyCompileBundledFiles: true,
                },
              },
            },
            {
              test: /\.(gif|png|jpe?g)$/i,
              use: [
                'file-loader',
                {
                  loader: 'image-webpack-loader',
                  options: {
                    disable: !isProduction,
                  },
                },
              ],
            },
            {
              test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
              use: [
                {
                  loader: 'file-loader',
                },
              ],
            },
            {
              test: /\.s[ac]ss$/i,
              issuer: /\.ejs$/i,
              use: [
                {
                  loader: 'file-loader',
                  options: {
                    name: '[hash].css',
                  },
                },
                'extract-loader',
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: 1,
                  },
                },
                'resolve-url-loader',
                'sass-loader',
              ],
            },
            {
              test: /\.s[ac]ss$/i,
              use: [
                isProduction
                  ? {
                      loader: MiniCssExtractPlugin.loader,
                      options: {
                        esModule: false,
                      },
                    }
                  : 'style-loader',
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: 1,
                    modules: isProduction
                      ? true
                      : {
                          localIdentName:
                            '[path][name]__[local]--[hash:base64:5]',
                        },
                  },
                },
                'resolve-url-loader',
                'sass-loader',
              ],
            },
            {
              test: /\.css$/i,
              issuer: /\.ejs$/i,
              use: [
                {
                  loader: 'file-loader',
                },
              ],
            },
            {
              test: /\.css$/i,
              use: [
                isProduction
                  ? {
                      loader: MiniCssExtractPlugin.loader,
                      options: {
                        esModule: false,
                      },
                    }
                  : 'style-loader',
                {
                  loader: 'css-loader',
                  options: {},
                },
              ],
            },
            {
              test: /\.svg$/,
              issuer: /\.tsx?$/,
              oneOf: [
                {
                  resourceQuery: /component/,
                  loader: '@svgr/webpack',
                  options: {
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                  },
                },
                {
                  loader: 'file-loader',
                },
              ],
            },
            {
              test: /\.svg$/,
              issuer: /\.s[ac]ss$/i,
              oneOf: [
                {
                  resourceQuery: /currentColor/,
                  use: [
                    { loader: 'svg-url-loader' },
                    {
                      loader: 'svg-colorize-loader',
                      options: { currentColor: 'currentColor' },
                    },
                  ],
                },
                { loader: 'svg-url-loader' },
              ],
            },
            {
              test: /\.svg$/,
              issuer: /\.ejs$/i,
              use: {
                loader: 'file-loader',
              },
            },
            {
              test: /\.json$/,
              oneOf: [
                {
                  resourceQuery: /url/,
                  loader: 'file-loader',
                  type: 'javascript/auto',
                },
                {
                  type: 'json',
                },
              ],
            },
            {
              test: /\.ya?ml$/,
              loader: 'yaml-loader',
              type: 'json',
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      modules: [resolve(applicationPath, 'node_modules')],
      symlinks: false,
      plugins: [
        new TsconfigPathsPlugin({
          configFile: resolve(applicationPath, 'tsconfig.json'),
        }),
      ],
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            priority: -20,
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          react: {
            priority: -10,
            test: /[\\/]node_modules[\\/](react|react-dom)/,
            name: 'react',
            chunks: 'all',
          },
        },
      },
    },
    plugins: [
      isProduction && new CleanWebpackPlugin(),
      isProduction &&
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash:8].css',
          chunkFilename: '[id].chunk.[contenthash:8].css',
        }),
      new EnvironmentPlugin({
        NODE_ENV: isProduction ? 'production' : 'development',
        DEBUG: false,
        npm_package_version: JSON.stringify(process.env.npm_package_version),
      }),
      new HtmlWebpackPlugin({
        template: entry.template,
      }),
      new EntryMetaPlugin({
        entry: entryFilePath,
      }),
      faviconPath &&
        new FaviconsWebpackPlugin({
          logo: faviconPath,
          prefix: 'favicons/',
          favicons: getFaviconsOptionsFromEntry(entry),
        }),
    ].filter(Boolean),
  } as webpack.Configuration

  upgradeCfgModule(applicationPath, cfg)

  return cfg
}

const getFaviconsOptionsFromEntry = (entry: Entry) =>
  // https://www.npmjs.com/package/favicons
  ({
    appName: entry.application.name,
    appShortName: entry.application.shortName,
    appDescription: entry.application.description,
    developerName: entry.developer.name,
    developerURL: entry.developer.url,
  })

const upgradeCfgModule = (
  applicationPath: string,
  cfg: webpack.Configuration
) => {
  const cfgPath = join(applicationPath, 'cfg.yml')

  const { variables } = readCfgSync(cfgPath)

  cfg.plugins = [
    ...(cfg.plugins || []),
    new DefinePlugin({
      __CFG_COMPILE_TIME__: JSON.stringify(
        variables.reduce((all, { name, default: d }) => {
          all[name] = process.env[name] || d
          return all
        }, {} as Record<string, string | undefined>)
      ),
      __CFG_BOOT_TIME__: '((window && window.__CFG_BOOT_TIME__) || {})',
    }),
  ]

  cfg.resolve = {
    ...(cfg.resolve || {}),
    alias: {
      ...(cfg.resolve?.alias || {}),
      cfg: join(__dirname, 'cfg.js'),
    },
  }
}
