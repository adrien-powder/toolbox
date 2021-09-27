import { Entry } from 'src/parsers/entry'
import webpack from 'webpack'
// @ts-ignore
import RawModule from 'webpack/lib/RawModule'

class EntryConfigureModulePlugin {
  entry: Entry

  constructor({ entry }: { entry: Entry }) {
    this.entry = entry
  }

  apply (compiler: webpack.Compiler) {
    compiler.hooks.normalModuleFactory.tap('EmptyModulePlugin', (nmf) => {
      nmf.hooks.resolve.tap('EmptyModulePlugin', (resolveData) => {
        if (/entry\.yml\.configuration$/.test(resolveData.request)) {
          const variables = this.entry.configuration

          const compileTime = JSON.stringify(
            variables.reduce((all, { name, default: d }) => {
              all[name] = process.env[name] || d
              return all
            }, {} as Record<string, string | undefined>)
          )

          const m = new RawModule(`module.exports = {
            ...${compileTime},
            ...((window && window.__ENTRY_CONFIGURATION_BOOT_TIME__) || {}),
          }`, resolveData.request)

          return m
        }
      })
    })
  }
 }


export default EntryConfigureModulePlugin
