/**
 * 该文件定义了两种打印方式: 警告与提示.
 * 同时提供了 组件 name值的格式化方法. 方便获取以及打印错误
 */
import config from '../config'
import { noop } from 'shared/util'

let warn = noop
let tip = noop
let formatComponentName

if (process.env.NODE_ENV !== 'production') {
  const hasConsole = typeof console !== 'undefined'
  const classifyRE = /(?:^|[-_])(\w)/g
  const classify = str => str
    .replace(classifyRE, c => c.toUpperCase())
    .replace(/[-_]/g, '')
  /**
   * 定义了两种打印方式. 警告 以及 提示.
   */
  warn = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.error(`[Vue warn]: ${msg} ` + (
        vm ? formatLocation(formatComponentName(vm)) : ''
      ))
    }
  }

  tip = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg} ` + (
        vm ? formatLocation(formatComponentName(vm)) : ''
      ))
    }
  }
  /**
   * 获取组件名称. 格式化消息信息
   */
  formatComponentName = (vm, includeFile) => {
    if (vm.$root === vm) {
      return '<Root>'
    }
    // _isVue 标志: 避免该实例被观察
    let name = vm._isVue
      ? vm.$options.name || vm.$options._componentTag
      : vm.name

    const file = vm._isVue && vm.$options.__file
    if (!name && file) {
      const match = file.match(/([^/\\]+)\.vue$/)
      name = match && match[1]
    }

    return (
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }
  /**
   * 消息信息格式化
   */
  const formatLocation = str => {
    if (str === `<Anonymous>`) {
      str += ` - use the "name" option for better debugging messages.`
    }
    return `\n(found in ${str})`
  }
}

export { warn, tip, formatComponentName }
