import { inBrowser } from './env'

export let perf
/**
 * 判断浏览器下 performance
 */
if (process.env.NODE_ENV !== 'production') {
  perf = inBrowser && window.performance
  if (perf && (!perf.mark || !perf.measure)) {
    perf = undefined
  }
}
