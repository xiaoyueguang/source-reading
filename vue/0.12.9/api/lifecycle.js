/**
 * 生命周期
 */
var _ = require('../util')
var compiler = require('../compiler')

/**
 * Set instance target element and kick off the compilation
 * process. The passed in `el` can be a selector string, an
 * existing Element, or a DocumentFragment (for block
 * instances).
 * 将实例插入到 目标节点中
 *
 * @param {Element|DocumentFragment|string} el
 * @public
 */

exports.$mount = function (el) {
  // 防止重复mount
  if (this._isCompiled) {
    process.env.NODE_ENV !== 'production' && _.warn(
      '$mount() should be called only once.'
    )
    return
  }
  el = _.query(el)
  if (!el) {
    // 没有节点则自己创建节点
    el = document.createElement('div')
  }
  // 编译 vue
  this._compile(el)
  this._isCompiled = true
  // 钩子
  this._callHook('compiled')
  this._initDOMHooks()
  if (_.inDoc(this.$el)) {
    // 在 document 中则执行钩子
    this._callHook('attached')
    ready.call(this)
  } else {
    // 不在文档中则先监听.
    this.$once('hook:attached', ready)
  }
  return this
}

/**
 * Mark an instance as ready.
 * 触发 ready 钩子
 */

function ready () {
  this._isAttached = true
  this._isReady = true
  this._callHook('ready')
}

/**
 * Teardown the instance, simply delegate to the internal
 * _destroy.
 * 移除实例时触发方法
 */

exports.$destroy = function (remove, deferCleanup) {
  this._destroy(remove, deferCleanup)
}

/**
 * Partially compile a piece of DOM and return a
 * decompile function.
 * 编译
 *
 * @param {Element|DocumentFragment} el
 * @param {Vue} [host]
 * @return {Function}
 */

exports.$compile = function (el, host) {
  return compiler.compile(el, this.$options, true, host)(this, el)
}
