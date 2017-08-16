import Module from './module'
import { assert, forEachValue } from '../util'
/**
 * 模块集合
 * path为路径. 越到后面, 链越深. 第一个为父.
 */
export default class ModuleCollection {
  constructor (rawRootModule) {
    // register root module (Vuex.Store options)
    // 注册模块. 收集模块
    this.register([], rawRootModule, false)
  }
  // 通过路径 获取模块
  get (path) {
    // 利用 reduce 来解析路径
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }
  // 获取在路径下命名空间的名称
  getNamespace (path) {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      // 有则添加 /
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }
  // 更新模块
  update (rawRootModule) {
    update([], this.root, rawRootModule)
  }
  /**
   * 注册模块
   * @param {string[]} path 路径集合
   * @param {Module} rawModule 模块
   * @param {boolean} runtime  运行时状态
   */
  register (path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      // 注册前先判断是否为合法的原生模块
      assertRawModule(path, rawModule)
    }
    // 将原生模块实例化为 Store 所需的模块
    const newModule = new Module(rawModule, runtime)
    // path 为空时, 则为根模块
    if (path.length === 0) {
      this.root = newModule
    } else {
      // 获取当前模块的父类
      const parent = this.get(path.slice(0, -1))
      // 在父类上添加子模块
      parent.addChild(path[path.length - 1], newModule)
    }

    // register nested modules
    // 如果该模块上还有子模块的话, 将循环调用 register 进行注册模块
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
  // 取消注册
  unregister (path) {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    if (!parent.getChild(key).runtime) return
    // 移除子模块
    parent.removeChild(key)
  }
}
/**
 * 更新
 * @param {string[]} path 路径集合
 * @param {Module} targetModule 原生模块
 * @param {Module} newModule 新的模块
 */
function update (path, targetModule, newModule) {
  if (process.env.NODE_ENV !== 'production') {
    // 断言判断是否符合模块
    assertRawModule(path, newModule)
  }

  // update target module
  // 更新需要被替换的模块
  targetModule.update(newModule)

  // update nested modules
  // 更新相关嵌套的模块
  if (newModule.modules) {
    // 循环替换
    for (const key in newModule.modules) {
      if (!targetModule.getChild(key)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[vuex] trying to add a new module '${key}' on hot reloading, ` +
            'manual reload is needed'
          )
        }
        return
      }
      update(
        // 新的路径
        path.concat(key),
        // 子模块
        targetModule.getChild(key),
        // 新的子模块
        newModule.modules[key]
      )
    }
  }
}
/**
 * 断言原生模块是否为合法的模块
 * @param {string[]} path 路径
 * @param {Module} rawModule 原生模块
 */
function assertRawModule (path, rawModule) {
  ['getters', 'actions', 'mutations'].forEach(key => {
    // 不存在 不判断 跳过
    if (!rawModule[key]) return
    // 循环判断 该值下的所有值为 true
    forEachValue(rawModule[key], (value, type) => {
      assert(
        // 判断是否为方法. 必须为方法
        typeof value === 'function',
        makeAssertionMessage(path, key, type, value)
      )
    })
  })
}
/**
 * 制作断言信息
 * @param {string[]} path 路径
 * @param {string} key 键值. 一般为 'getters', 'actions', 'mutations'中的一种
 * @param {string} type 值 即上面三种属性下的键值
 * @param {object} value 值
 * @return {string} 断言信息
 */
function makeAssertionMessage (path, key, type, value) {
  let buf = `${key} should be function but "${key}.${type}"`
  if (path.length > 0) {
    buf += ` in module "${path.join('.')}"`
  }
  buf += ` is ${JSON.stringify(value)}.`

  return buf
}
