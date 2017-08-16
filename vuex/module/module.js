/**
 * 模块
 */
import { forEachValue } from '../util'

export default class Module {
  /**
   * 构造方法
   *
   * @param {object} rawModule 模块的原始对象
   * @param {*} runtime 运行时
   */
  constructor (rawModule, runtime) {
    /**
     * 定义运行时状态
     * 子模块
     * 原生模块
     * 原生状态
     */
    this.runtime = runtime
    this._children = Object.create(null)
    this._rawModule = rawModule
    const rawState = rawModule.state
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
  }
  /**
   * namespaced
   * 默认情况下 action、mutation 和 getter是自动注册到全局下的.
   * 这样就会出现冲突的情况, 如果需要避免冲突, 则可以通过设置 rawModule 原始模块的 namespaced
   * 当该值为 true 时, 会返回 true. 而模块被注册后,
   * 会将这三种(action, mutation, getter)按照路径分配下去
   */
  get namespaced () {
    return !!this._rawModule.namespaced
  }
  /**
   * 添加子模块
   * @param {string} key  键值
   * @param {Module} module 模块
   */
  addChild (key, module) {
    this._children[key] = module
  }
  /**
   * 移除子模块
   * @param {string} key 键值
   */
  removeChild (key) {
    delete this._children[key]
  }
  /**
   * 获取子模块
   * @param {string} key 键值
   */
  getChild (key) {
    return this._children[key]
  }
  /**
   * 更新模块
   * @param {Module} rawModule 原始模块
   */
  update (rawModule) {
    this._rawModule.namespaced = rawModule.namespaced
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters
    }
  }
  /**
   * forEach****
   * 以下以 forEach 为开头的方法,
   * 功能都差不多, 会进行循环, 接受一个方法
   * 该方法为一个回调, 方法内参数有两个 key, value
   * 这两个是从对应的循环里取出来的 键值对.
   * @param {function} fn 回调方法
   */

  forEachChild (fn) {
    forEachValue(this._children, fn)
  }

  forEachGetter (fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }

  forEachAction (fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn)
    }
  }

  forEachMutation (fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
}
