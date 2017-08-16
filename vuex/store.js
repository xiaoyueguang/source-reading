import applyMixin from './mixin'
import devtoolPlugin from './plugins/devtool'
import ModuleCollection from './module/module-collection'
import { forEachValue, isObject, isPromise, assert } from './util'

// 这里的 Vue 会在 install 之后, 被外面的 Vue 绑上
let Vue // bind on install
/**
 * 主要类
 */
export class Store {
  constructor (options = {}) {
    // 断言判断. Vue Promise 以及 是否为该类实例化出来的实例
    if (process.env.NODE_ENV !== 'production') {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
      assert(this instanceof Store, `Store must be called with the new operator.`)
    }

    const {
      plugins = [],
      strict = false
    } = options
    /**
     * 状态树, 全局只有一个.
     */
    let {
      state = {}
    } = options
    if (typeof state === 'function') {
      state = state()
    }

    // store internal state
    /**
     * 创建私有属性.
     * actions
     * mutations
     * getters
     * modules
     */
    // 提交状态. 用来确保 state 不被非法提交修改
    this._committing = false
    this._actions = Object.create(null)
    this._mutations = Object.create(null)
    this._wrappedGetters = Object.create(null)
    // 模块
    this._modules = new ModuleCollection(options)
    // 命名空间 map
    this._modulesNamespaceMap = Object.create(null)
    // 观察者
    this._subscribers = []
    // 利用 Vue 来进行 Observer
    this._watcherVM = new Vue()

    // bind commit and dispatch to self
    // 定义绑定 dispatch 和 commit
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    // 严格模式
    this.strict = strict

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    // 安装模块
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    resetStoreVM(this, state)

    // apply plugins
    // 引用插件
    plugins.forEach(plugin => plugin(this))

    if (Vue.config.devtools) {
      devtoolPlugin(this)
    }
  }
  // 返回私有 vm 的状态数据
  get state () {
    return this._vm._data.$$state
  }
  // 不能直接修改 state. 必须通过 replaceState 来调整
  set state (v) {
    if (process.env.NODE_ENV !== 'production') {
      assert(false, `Use store.replaceState() to explicit replace store state.`)
    }
  }
  /**
   * 提交
   * @param {*} _type 类型
   * @param {*} _payload 参数
   * @param {*} _options 选项
   */
  commit (_type, _payload, _options) {
    // check object-style commit
    // 检查传入的对象
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)
    // 本次的 mutation
    const mutation = { type, payload }
    // 入口
    const entry = this._mutations[type]
    // 判断有无
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // 提交方法
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        // 触发所有的 同名commit
        handler(payload)
      })
    })
    /**
     * 触发所有被观察的事件
     * 因为 mutation 为同步事件, 因此订阅能够从这里准确的订阅到
     * 所有的 mutation 以及 变化后的状态
     */
    this._subscribers.forEach(sub => sub(mutation, this.state))

    if (
      process.env.NODE_ENV !== 'production' &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }
  /**
   * 调度
   * @param {string|object} _type 方法
   * @param {any} _payload 参数
   */
  dispatch (_type, _payload) {
    // check object-style dispatch
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const entry = this._actions[type]
    // 检查是否有该方法
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }
    // 返回的Promise必须已经全部完成本次的dispatch
    return entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)
  }
  /**
   * 订阅
   * @param {function} fn  观察方法
   * @return {function} 取消
   */
  subscribe (fn) {
    const subs = this._subscribers
    if (subs.indexOf(fn) < 0) {
      subs.push(fn)
    }
    return () => {
      const i = subs.indexOf(fn)
      if (i > -1) {
        subs.splice(i, 1)
      }
    }
  }
  /**
   * 监听
   * @param {*} getter 
   * @param {*} cb 
   * @param {*} options 
   */
  watch (getter, cb, options) {
    if (process.env.NODE_ENV !== 'production') {
      assert(typeof getter === 'function', `store.watch only accepts a function.`)
    }
    return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
  }
  /**
   * 替换状态
   * @param {State} state 替换状态
   */
  replaceState (state) {
    this._withCommit(() => {
      this._vm._data.$$state = state
    })
  }
  /**
   * 注册模块
   * @param {string[]|string} path 路径
   * @param {Module} rawModule 模块
   */
  registerModule (path, rawModule) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      // 断言判断. 路径集合必须为数组. 且根模块不能注册
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }
    // 注册
    this._modules.register(path, rawModule)
    // 安装模块
    installModule(this, this.state, path, this._modules.get(path))
    // reset store to update getters...
    // 复位Store
    resetStoreVM(this, this.state)
  }
  // 按路径取消模块
  unregisterModule (path) {
    if (typeof path === 'string') path = [path]

    if (process.env.NODE_ENV !== 'production') {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }
    // 取消模块
    this._modules.unregister(path)
    // 强制性删除父模块上的 state.
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1))
      Vue.delete(parentState, path[path.length - 1])
    })
    // 复位 store
    resetStore(this)
  }
  // 热更新. 热更新模块
  hotUpdate (newOptions) {
    this._modules.update(newOptions)
    resetStore(this, true)
  }
  // 提交. 调整状态后再提交
  _withCommit (fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}
/**
 * 重置 store
 * @param {Store} store 实例
 * @param {boolean} hot 热替换
 */
function resetStore (store, hot) {
  // 所有都清空掉
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // init all modules
  // 安装所有模块
  installModule(store, state, [], store._modules.root, true)
  // reset vm
  // 重置 vm
  resetStoreVM(store, state, hot)
}
/**
 * 重置实例里的 vm 实例
 * @param {Store} store 实例
 * @param {object} state 状态
 * @param {boolean} hot 热替换
 */
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  // 清空getters
  store.getters = {}
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // 从老的 getters 上复制到新的 getters
    computed[key] = () => fn(store)
    Object.defineProperty(store.getters, key, {
      // 复制方法
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  // 取消所有的日志和警告
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  // 开启严格模式
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      // 强制性清空旧的state. 通过 vue 的 watch. 清空掉 getters 上老的依赖
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    // 摧毁
    Vue.nextTick(() => oldVm.$destroy())
  }
}
/**
 * 安装模块
 * @param {Store} store store实例
 * @param {object} rootState 根状态
 * @param {string[]} path 路径
 * @param {Module} module 模块
 * @param {boolean} hot 热替换
 */
function installModule (store, rootState, path, module, hot) {
  // 路径为空时, 为根路径
  const isRoot = !path.length
  // 获取该模块命名空间
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  // 开启命名空间时,
  if (module.namespaced) {
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  // 非根目录
  if (!isRoot && !hot) {
    // 获取父状态
    const parentState = getNestedState(rootState, path.slice(0, -1))
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      // 在父状态节点上添加 子状态
      Vue.set(parentState, moduleName, module.state)
    })
  }
  // 定义方法集合. dispatch, commit, getters, state.
  // 根据命名空间返回不同的值
  const local = module.context = makeLocalContext(store, namespace, path)
  // 注册 mutation, action 和 getters

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const namespacedType = namespace + key
    registerAction(store, namespacedType, action, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })
  // 循环注册模块
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}

/**
 * make localized dispatch, commit, getters and state
 * if there is no namespace, just use root ones
 * 定义是否存在命名空间时 不同的dispatch commit getters 和 state
 */
function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === ''

  const local = {
    // 
    dispatch: noNamespace ? store.dispatch : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (process.env.NODE_ENV !== 'production' && !store._actions[type]) {
          console.error(`[vuex] unknown local action type: ${args.type}, global type: ${type}`)
          return
        }
      }

      return store.dispatch(type, payload)
    },

    commit: noNamespace ? store.commit : (_type, _payload, _options) => {
      const args = unifyObjectStyle(_type, _payload, _options)
      const { payload, options } = args
      let { type } = args

      if (!options || !options.root) {
        type = namespace + type
        if (process.env.NODE_ENV !== 'production' && !store._mutations[type]) {
          console.error(`[vuex] unknown local mutation type: ${args.type}, global type: ${type}`)
          return
        }
      }

      store.commit(type, payload, options)
    }
  }

  // getters and state object must be gotten lazily
  // because they will be changed by vm update
  Object.defineProperties(local, {
    getters: {
      get: noNamespace
        ? () => store.getters
        : () => makeLocalGetters(store, namespace)
    },
    state: {
      get: () => getNestedState(store.state, path)
    }
  })

  return local
}

function makeLocalGetters (store, namespace) {
  const gettersProxy = {}

  const splitPos = namespace.length
  Object.keys(store.getters).forEach(type => {
    // skip if the target getter is not match this namespace
    if (type.slice(0, splitPos) !== namespace) return

    // extract local getter type
    const localType = type.slice(splitPos)

    // Add a port to the getters proxy.
    // Define as getter property because
    // we do not want to evaluate the getters in this time.
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type],
      enumerable: true
    })
  })

  return gettersProxy
}

function registerMutation (store, type, handler, local) {
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    handler.call(store, local.state, payload)
  })
}

function registerAction (store, type, handler, local) {
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload, cb) {
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload, cb)
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      return res.catch(err => {
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      return res
    }
  })
}

function registerGetter (store, type, rawGetter, local) {
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}
/**
 * 开启严格模式
 * @param {Store} store 
 */
function enableStrictMode (store) {
  // 直接利用 Vue 的 watch 监听所有值的变化.
  store._vm.$watch(function () { return this._data.$$state }, () => {
    if (process.env.NODE_ENV !== 'production') {
      // 当值有变化时, 判断是否允许提交. 不允许则直接提醒报错
      assert(store._committing, `Do not mutate vuex store state outside mutation handlers.`)
    }
  }, { deep: true, sync: true })
}
/**
 * 获取嵌套的状态
 * @param {*} state 根状态
 * @param {*} path 路径
 */
function getNestedState (state, path) {
  return path.length
    ? path.reduce((state, key) => state[key], state)
    : state
}
/**
 * 解压type获取准确的值
 * @param {string} type dispatch 的 type
 * @param {any} payload dispatch 传的参数
 * @param {*} options 选项
 * @return {object}
 */
function unifyObjectStyle (type, payload, options) {
  // 判断对象
  if (isObject(type) && type.type) {
    options = payload
    payload = type
    type = type.type
  }

  if (process.env.NODE_ENV !== 'production') {
    // 断言判断. type 必须为 字符串
    assert(typeof type === 'string', `Expects string as the type, but found ${typeof type}.`)
  }

  return { type, payload, options }
}
/**
 * 安装方法
 * @param {Vue} _Vue 
 */
export function install (_Vue) {
  // 确保不被重复安装
  if (Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        // 仅仅需要安装一次
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}

// auto install in dist mode
// 能读取到外面的 Vue 时 直接自动安装
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}
