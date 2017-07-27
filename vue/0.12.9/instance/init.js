/**
 * Vue 实例化
 */
var mergeOptions = require('../util').mergeOptions

/**
 * The main init sequence. This is called for every
 * instance, including ones that are created from extended
 * constructors.
 * 主要的 构造方法. 定义私有方法
 * @param {Object} options - this options object should be
 *                           the result of merging class
 *                           options and the options passed
 *                           in to the constructor.
 */

exports._init = function (options) {

  options = options || {}
  // 自身
  this.$el = null
  // 父 vm
  this.$parent = options._parent
  // 根 vm
  this.$root = options._root || this
  // 子 vm
  this.$children = []
  // 
  this.$ = {}           // child vm references
  this.$$ = {}          // element references
  // 观察者 watchers 集合
  this._watchers = []   // all watchers as an array
  // 指令
  this._directives = [] // all directives
  // 子vm
  this._childCtors = {} // inherit:true constructors

  // a flag to avoid this being observed
  // 为 vue
  this._isVue = true

  // events bookkeeping
  // 事件
  this._events = {}            // registered callbacks
  // 广播次数
  this._eventsCount = {}       // for $broadcast optimization
  // 可中止事件. 阻止
  this._eventCancelled = false // for event cancellation

  // fragment instance properties
  // 是否为标签
  this._isFragment = false
  // 开始
  this._fragmentStart =    // @type {CommentNode}
  // 结束
  this._fragmentEnd = null // @type {CommentNode}

  // lifecycle state
  // 生命周期状态
  this._isCompiled =
  this._isDestroyed =
  this._isReady =
  this._isAttached =
  this._isBeingDestroyed = false
  this._unlinkFn = null

  // context: the scope in which the component was used,
  // and the scope in which props and contents of this
  // instance should be compiled in.
  // 当前上下文
  this._context =
    options._context ||
    options._parent

  // push self into parent / transclusion host
  // 如果本身有父组件, 则在父组件的子组件集合中传入自己
  if (this.$parent) {
    this.$parent.$children.push(this)
  }

  // props used in v-repeat diffing
  // v-repeat 指令专用
  this._reused = false
  this._staggerOp = null
  // 生成一个 options
  // merge options.
  options = this.$options = mergeOptions(
    this.constructor.options,
    options,
    this
  )

  // initialize data as empty object.
  // it will be filled up in _initScope().
  // 原本空 data
  this._data = {}
  // 初始化
  // initialize data observation and scope inheritance.
  this._initScope()

  // setup event system and option events.
  this._initEvents()

  // call created hook
  // 触发钩子
  this._callHook('created')

  // if `el` option is passed, start compilation.
  // 挂载到 DOM 节点中
  if (options.el) {
    this.$mount(options.el)
  }
}
