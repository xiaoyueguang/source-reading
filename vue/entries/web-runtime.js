/* @flow */
/**
 * build 文件的入口文件. 因此从这开始读
 * 这里设置 web环境下 的配置.
 */
import Vue from 'core/index'
// 包含各种配置项.
import config from 'core/config'
import { patch } from 'web/runtime/patch'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser, isChrome } from 'core/util/index'
import platformDirectives from 'web/runtime/directives/index'
import platformComponents from 'web/runtime/components/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

// install platform specific utils
// 安装特定平台的工具.
// TODO
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// 扩展 vue默认的指令和组件
// 默认指令有 v-model 以及 v-show.
// 默认组件有 <transition> <transition-group>
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// TODO
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
// 将 组件 挂载到某个 dom元素下.
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
// 检测开发者工具. setTimeout 运行, 保证不影响主要任务执行.
setTimeout(() => {
  if (config.devtools) {
    if (devtools) {
      devtools.emit('init', Vue)
    } else if (process.env.NODE_ENV !== 'production' && isChrome) {
      console[console.info ? 'info' : 'log'](
        'Download the Vue Devtools extension for a better development experience:\n' +
        'https://github.com/vuejs/vue-devtools'
      )
    }
  }
  if (process.env.NODE_ENV !== 'production' &&
      config.productionTip !== false &&
      inBrowser && typeof console !== 'undefined') {
    console[console.info ? 'info' : 'log'](
      `You are running Vue in development mode.\n` +
      `Make sure to turn on production mode when deploying for production.\n` +
      `See more tips at https://vuejs.org/guide/deployment.html`
    )
  }
}, 0)

export default Vue
