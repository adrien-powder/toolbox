import { readFileSync as readFileSyncNode } from 'fs'
import { readFile as readFileNode } from 'fs/promises'
import YAML from 'yaml'

interface Cfg {
  variables: Array<{
    name: string
    type: string
    default: string | undefined
  }>
}

const decode = (cfg: any): Cfg => {
  return {
    variables:
      Object.entries(cfg.variables)
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
          // @ts-ignore
          type: v.type || 'string',
          // @ts-ignore
          default: v.default,
        }
      })
  }
}

export const readSync = (cfgPath: string) => {
  const cfg = YAML.parse(readFileSyncNode(cfgPath, { encoding: 'utf-8' }))

  return decode(cfg)
}

export const read = async (cfgPath: string) => {
  const cfg = YAML.parse(await readFileNode(cfgPath, { encoding: 'utf-8' }))

  return decode(cfg)
}
