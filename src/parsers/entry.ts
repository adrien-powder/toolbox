import { readFileSync as readFileSyncNode } from 'fs'
import { readFile as readFileNode } from 'fs/promises'
import YAML from 'yaml'
import * as t from 'io-ts'
import { isRight } from 'fp-ts/Either'
import { PathReporter } from 'io-ts/PathReporter'
import { dirname, join, isAbsolute } from 'path'

const tConfiguration = t.record(t.string, t.union([
  t.string,
  t.type({
    type: t.string,
    default: t.union([t.undefined, t.string])
  })
]))

type Configuration = t.TypeOf<typeof tConfiguration>


const tInputEntry = t.intersection([
  t.type({
    main: t.string,
    title: t.string,
    description: t.string,
    developer: t.type({
      name: t.string,
      url: t.string,
    }),
    application: t.intersection([
      t.type({
        name: t.string,
      }),
      t.partial({
        description: t.string,
        shortName: t.string,
      }),
    ]),
  }),
  t.partial({
    configuration: tConfiguration,
    titleTemplate: t.string,
    template: t.string,
    favicon: t.string,
    keywords: t.array(t.string),
    og: t.partial({
      siteName: t.string,
      title: t.string,
      description: t.string,
      url: t.string,
      // https://ogp.me/#types
      type: t.string,
      image: t.string,
    }),
  }),
])

type InputEntry = t.TypeOf<typeof tInputEntry>

const decode = (e: any): InputEntry => {
  const result = tInputEntry.decode(e)

  if (isRight(result)) {
    return result.right
  }

  throw new Error(PathReporter.report(result).join(', '))
}

const decodeConfiguration = (cfg: Configuration) => {
  return Object.entries(cfg)
      .map(([name, v]) => {
        if (typeof v === 'string') {
          return {
            name,
            type: v,
            default: undefined,
          }
        }
        return {
          name,
          type: v.type || 'string',
          default: v.default,
        }
      })
}

const normalizePath = (p: string | undefined, cwd: string): string | null => (
  p ? (isAbsolute(p) ? p : join(cwd, p)) : null
)

const normalize = (e: InputEntry, cwd: string) => {
  const favicon = normalizePath(e.favicon, cwd)
  const template = normalizePath(e.template, cwd)
  const main = normalizePath(e.main, cwd)

  return {
    main,
    title: e.title,
    titleTemplate: e.titleTemplate ? e.titleTemplate : `%s ${e.title}`,
    template,
    description: e.description,
    keywords: e.keywords || [],
    favicon,
    application: {
      name: e.application.name,
      description: e.application.description || e.description,
      shortName: e.application.shortName || e.application.name,
    },
    developer: e.developer,
    og: {
      siteName: e.og?.siteName || e.application.name,
      title: e.og?.title || e.title,
      description: e.og?.description || e.description,
      url: e.og?.url,
      // https://ogp.me/#types
      type: e.og?.type,
      image: e.og?.image,
    },
    configuration: e.configuration ? decodeConfiguration(e.configuration) : [],
  }
}

export type Entry = ReturnType<typeof normalize>

export const readSync = (path: string) => {
  const cfg = YAML.parse(readFileSyncNode(path, { encoding: 'utf-8' }))

  return normalize(decode(cfg), dirname(path))
}

export const read = async (path: string) => {
  const cfg = YAML.parse(await readFileNode(path, { encoding: 'utf-8' }))

  return normalize(decode(cfg), dirname(path))
}
