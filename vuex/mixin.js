/**
 * 混合方法
 * @param {Vue} Vue 
 */
export default function (Vue) {
  // 判断 Vue 版本
  const version = Number(Vue.version.split('.')[0])
  // vue 版本为2时, 在创建之前先执行 vuexInit
  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit })
  } else {
    // Vue 版本为1时, 在 Vue 的原型方法 _init 上处理
    // 将 vuexInit 方法传入进去, 完成初始化
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   * Vuex初始化, 将 vuex 实例放到所有的 vue 实例下.
   * 实现所有地方都能读取到 $store
   */

  function vuexInit () {
    const options = this.$options
    // store injection
    // 有注入 store 时, 将该实例放到根目录下
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}
