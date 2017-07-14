/**
 * watcher 系统
 */
var _ = require('./util')
var config = require('./config')
var Dep = require('./observer/dep')
var expParser = require('./parsers/expression')
var batcher = require('./batcher')
var uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * watch 构造函数
 * watch 用于解析表达式, 收集依赖.
 * 当表达式改变时, 触发回调.
 * $watch 和 指令里都讲会用到 watch
 * @param {Vue} vm 实例
 * @param {String} expression 表达式
 * @param {Function} cb 回调
 * @param {Object} options 选项
 *                 - {Array} filters 过滤
 *                 - {Boolean} twoWay 双向绑定
 *                 - {Boolean} deep 深度观察
 *                 - {Boolean} user 
 *                 - {Boolean} lazy 懒观察
 *                 - {Function} [preProcess]
 * @constructor
 */

function Watcher (vm, expOrFn, cb, options) {
  var isFn = typeof expOrFn === 'function'
  this.vm = vm
  // 每次实例化就将会在对应的 vue 实例上推入观察者
  vm._watchers.push(this)
  // 获取表达式. 如果为方法, 则取出方法的表达式
  this.expression = isFn ? expOrFn.toString() : expOrFn
  this.cb = cb
  // watch 的 ID 都将是唯一的
  this.id = ++uid // uid for batching
  this.active = true
  // 设置属性
  options = options || {}
  this.deep = !!options.deep
  this.user = !!options.user
  this.twoWay = !!options.twoWay
  this.lazy = !!options.lazy
  this.dirty = this.lazy
  this.filters = options.filters
  this.preProcess = options.preProcess
  // 依赖关系数组
  this.deps = []
  this.newDeps = null
  // parse expression for getter/setter
  if (isFn) {
    // 为方法的时候 设置 getter
    this.getter = expOrFn
    this.setter = undefined
  } else {
    // 为表达式的时候 利用表达式解析, 设置 setter/getter
    var res = expParser.parse(expOrFn, options.twoWay)
    this.getter = res.get
    this.setter = res.set
  }
  this.value = this.lazy
    ? undefined
    : this.get()
  // state for avoiding false triggers for deep and Array
  // watchers during vm._digest()
  // 设置队列. 避免观察过深(deep)或过多(Array) 导致触发多次
  this.queued = this.shallow = false
}

var p = Watcher.prototype

/**
 * Add a dependency to this directive.
 * 给 指令 添加依赖
 *
 * @param {Dep} dep
 */

p.addDep = function (dep) {
  var newDeps = this.newDeps
  var old = this.deps
  // 将 原先的依赖 按照顺序添加. 顺便检查 避免添加重复的依赖函数
  if (_.indexOf(newDeps, dep) < 0) {
    newDeps.push(dep)
    var i = _.indexOf(old, dep)
    if (i < 0) {
      // TODO: addSub
      dep.addSub(this)
    } else {
      old[i] = null
    }
  }
}

/**
 * Evaluate the getter, and re-collect dependencies.
 * 评估 getter. 并重新收集依赖
 */

p.get = function () {
  // 清空收集依赖
  this.beforeGet()
  var vm = this.vm
  var value
  try {
    // 获取值. 并且利用 try 来报错
    value = this.getter.call(vm, vm)
  } catch (e) {
    if (
      process.env.NODE_ENV !== 'production' &&
      config.warnExpressionErrors
    ) {
      _.warn(
        'Error when evaluating expression "' +
        this.expression + '". ' +
        (config.debug
          ? '' :
          'Turn on debug mode to see stack trace.'
        ), e
      )
    }
  }
  // "touch" every property so they are all tracked as
  // dependencies for deep watching
  // 如果带有 deep 属性. 则将整个对象或数组进行监视
  if (this.deep) {
    traverse(value)
  }
  if (this.preProcess) {
    value = this.preProcess(value)
  }
  // 过滤
  if (this.filters) {
    value = vm._applyFilters(value, null, this.filters, false)
  }
  this.afterGet()
  return value
}

/**
 * Set the corresponding value with the setter.
 * 设置值, 利用 setter 去设置
 * @param {*} value
 */

p.set = function (value) {
  var vm = this.vm
  if (this.filters) {
    value = vm._applyFilters(
      value, this.value, this.filters, true)
  }
  try {
    this.setter.call(vm, vm, value)
  } catch (e) {
    if (
      process.env.NODE_ENV !== 'production' &&
      config.warnExpressionErrors
    ) {
      _.warn(
        'Error when evaluating setter "' +
        this.expression + '"', e
      )
    }
  }
}

/**
 * Prepare for dependency collection.
 * 清空新的依赖数组
 */

p.beforeGet = function () {
  Dep.target = this
  this.newDeps = []
}

/**
 * Clean up for dependency collection.
 * 清空依赖收集 将依赖清空, 并将收集到的新依赖放到原本的依赖数组里
 */

p.afterGet = function () {
  Dep.target = null
  var i = this.deps.length
  while (i--) {
    var dep = this.deps[i]
    if (dep) {
      dep.removeSub(this)
    }
  }
  this.deps = this.newDeps
  this.newDeps = null
}

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 * 更新值. 依赖有变化时, 进行调用
 * @param {Boolean} shallow
 */

p.update = function (shallow) {
  if (this.lazy) {
    this.dirty = true
  } else if (!config.async) {
    this.run()
  } else {
    // if queued, only overwrite shallow with non-shallow,
    // but not the other way around.
    this.shallow = this.queued
      ? shallow
        ? this.shallow
        : false
      : !!shallow
    this.queued = true
    batcher.push(this)
  }
}

/**
 * Batcher job interface.
 * Will be called by the batcher.
 * 依赖执行. 收集依赖
 */

p.run = function () {
  if (this.active) {
    var value = this.get()
    if (
      value !== this.value ||
      // Deep watchers and Array watchers should fire even
      // when the value is the same, because the value may
      // have mutated; but only do so if this is a
      // non-shallow update (caused by a vm digest).
      ((_.isArray(value) || this.deep) && !this.shallow)
    ) {
      var oldValue = this.value
      this.value = value
      this.cb(value, oldValue)
    }
    this.queued = this.shallow = false
  }
}

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 * 评估. 收集依赖
 */

p.evaluate = function () {
  // avoid overwriting another watcher that is being
  // collected.
  var current = Dep.target
  this.value = this.get()
  this.dirty = false
  Dep.target = current
}

/**
 * Depend on all deps collected by this watcher.
 * 执行 watcher 上的 依赖上更新依赖
 */

p.depend = function () {
  var i = this.deps.length
  while (i--) {
    // TODO:
    this.deps[i].depend()
  }
}

/**
 * Remove self from all dependencies' subcriber list.
 * 移除 watcher.
 * 从vue 实例的 watchers 里移除.
 * 依赖中也移除
 */

p.teardown = function () {
  if (this.active) {
    // remove self from vm's watcher list
    // we can skip this if the vm if being destroyed
    // which can improve teardown performance.
    if (!this.vm._isBeingDestroyed) {
      this.vm._watchers.$remove(this)
    }
    var i = this.deps.length
    while (i--) {
      this.deps[i].removeSub(this)
    }
    this.active = false
    this.vm = this.cb = this.value = null
  }
}

/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 * 将一个对象里的所有属性都进行观察
 *
 * @param {Object} obj
 */

function traverse (obj) {
  var key, val, i
  for (key in obj) {
    val = obj[key]
    if (_.isArray(val)) {
      i = val.length
      while (i--) traverse(val[i])
    } else if (_.isObject(val)) {
      traverse(val)
    }
  }
}

module.exports = Watcher
