import { readFile } from 'fs-extra'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { imageSize as imageSizeSync } from 'image-size'
import { join, dirname } from 'path'
import { promisify } from 'util'
import webpack from 'webpack'

import { Entry, readSync as readEntry } from '../lib/entry'

const imageSize = promisify(imageSizeSync)

const buildMetaFromEntry = (entry: Entry) => {
  return {
    description: entry.description,
    keywords: entry.keywords.join(','),
    renderer: 'webkit',
    HandheldFriendly: 'true',
    'applicable-device': 'pc, mobile',
    viewport: 'width=device-width, initial-scale=1',
    google: 'notranslate',
    // https://developers.google.com/search/docs/advanced/crawling/block-indexing#meta-tag
    robots: 'noindex',
    // https://ogp.me/
    'og:site_name': entry.og.siteName,
    'og:type': entry.og.type,
    'og:title': entry.og.title,
    'og:description': entry.og.description,
    'og:url': entry.og.url,
  }
}

const replacePlaceholdersInFilename = (
  filename: string,
  fileContent: string | Buffer,
  compilation: webpack.Compilation,
  compiler: webpack.Compiler
) => {
  const hash = compiler.webpack.util.createHash(
    compilation.outputOptions.hashFunction || 'md5'
  )
  hash.update(fileContent)
  if (compilation.outputOptions.hashSalt) {
    hash.update(compilation.outputOptions.hashSalt)
  }
  const contentHash = hash
    .digest(compilation.outputOptions.hashDigest)
    .slice(0, compilation.outputOptions.hashDigestLength)
    .toString()
  return compilation.getPathWithInfo(filename, {
    contentHash,
    chunk: {
      hash: contentHash,
      // @ts-ignore
      contentHash,
    },
  })
}

const emitOpenGraphImage = async (
  compiler: webpack.Compiler,
  compilation: webpack.Compilation,
  imagePath: string
) => {
  let result = null

  try {
    result = await imageSize(imagePath)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
  }

  if (!result) {
    return null
  }

  const content = await readFile(imagePath)

  const { path, info } = replacePlaceholdersInFilename(
    'og-image.[contenthash].png',
    content,
    compilation,
    compiler
  )

  compilation.emitAsset(
    path,
    new webpack.sources.RawSource(content, false),
    info
  )

  const url = compilation.outputOptions.publicPath + path

  const image = {
    'og:image': url,
    'og:image:secure_url': url,
    'og:image:type': `image/${result.type}`,
    'og:image:width': result.width,
    'og:image:height': result.height,
  }

  return image
}

class EntryMetaPlugin {
  private path: string

  constructor(options: { entry: string }) {
    this.path = options.entry
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap('EntryMetaPlugin', (compilation) => {
      const entry = readEntry(this.path)

      // Static Plugin interface |compilation |HOOK NAME | register listener
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
        'EntryMetaPlugin', // <-- Set a meaningful name here for stacktraces
        async (data, cb) => {
          let metaMap = buildMetaFromEntry(entry)

          // compilation.fileDependencies.add()

          if (entry.og.image) {
            const imagePath = join(dirname(this.path), entry.og.image)

            metaMap = {
              ...metaMap,
              ...(await emitOpenGraphImage(compiler, compilation, imagePath)),
            }
          }

          Object.entries(metaMap).forEach(([name, content]) => {
            data.assetTags.meta.push({
              tagName: 'meta',
              attributes: {
                name,
                content,
              },
              voidTag: true,
              meta: {
                plugin: 'powder-entry-meta-plugin',
              },
            })
          })
          // Manipulate the content
          // Tell webpack to move on
          cb(null, data)
        }
      )
    })
  }
}

export default EntryMetaPlugin
