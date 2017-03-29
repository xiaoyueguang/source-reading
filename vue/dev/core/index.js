/**
 * Vue核心.
 * ../entry里包含了 Vue在各个环境中(Browser, weex)里不同的行为注册
 * 而 该js 则是 包含vue 的核心部分. 即不同环境中共同的部分
 */
// 
import Vue from './instance/index'
// 安装全局 API
import { initGlobalAPI } from './global-api/index'
// 服务器端渲染
import { isServerRendering } from 'core/util/env'

initGlobalAPI(Vue)

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})
// 通过 rollup 动态给VUE 添加版本
Vue.version = '__VERSION__'

export default Vue
