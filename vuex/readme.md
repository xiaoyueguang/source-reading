# `Vuex` 源码解读
> 基于`Vue`的`Flux`实现, 专门用于`Vue`应用程序开发的**状态管理模式**
当一个`Vue`应用变得很大, 很复杂的时候, 这时开发者将会遇到以下几个问题:
1. 不同组件依赖同一个状态
2. 不同的组件如何去修改这个状态

`Flux`的单向数据流, 即下图
![](./images/flow.png)
1. 数据生成页面
2. 页面调用方法
3. 方法修改数据

依次循环.
借鉴了`Flux`的思想, 实现了基于`Vue`的`Flux`架构, 即`Vuex`
![](./images/vuex.png)

`Vuex`中包含 `Actions`, `Mutations`, `State`
* 组件从`State`中获取状态, 来渲染页面
* 组件通过调用`Actions`来触发提交
* `Actions`与后端交互, 并提交对应的`Mutations`
* `Mutations`去修改对应的`State`值, 并将过程记录到`Devtools`, 以实现时间旅游的效果

## 入口文件
`index.js`  
`index.esm.js`  
这两个为入口文件. 不同的是, 后者多了个 `export{}`, 方便通过`import {Store} from 'vuex'`的形式去引用.  
这两个文件可以清楚的看到`Vuex`暴露出来的`api`

## `Vue.use(Vuex)`
做为`Vue`的官方插件之一, `Vuex`带有`install`方法, 在这个方法里, 通过读取外部定义的`Vue`来判断是否已经被安装过了, 并且运用`applyMixin`方法.  
```
// 获取 Vue 版本
const version = Number(Vue.version.split('.')[0])
// vue 版本为2时, 在创建之前先执行 vuexInit
if (version >= 2) {
  Vue.mixin({ beforeCreate: vuexInit })
} else {
  // Vue 版本为1时, 在 Vue 的原型方法 _init 上处理
  // 将 vuexInit 方法传入进去, 完成初始化
  const _init = Vue.prototype._init
  Vue.prototype._init = function (options = {}) {
    options.init = options.init
      ? [vuexInit].concat(options.init)
      : vuexInit
    _init.call(this, options)
  }
}

/**
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
```
`applyMixin`方法主要是对`Vue`做稍微的改动, 使得每个组件或`Vue`实例生成的时候, 在其实例下注入$store. 使得开发者能在任何实例下都能很轻松的通过`this.$store`来进行调用`Store`
> 当`Vuex`通过 js文件 引用进来时, 会自动执行`install`, 来完成初始化.

## `Store`
### `Store`构造函数
`Vuex`中最主要的类.  
首先通过三个断言, 来判断当前环境是否符合`Vuex`的运行.
```
assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
assert(this instanceof Store, `Store must be called with the new operator.`)
// 断言
export function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}
```
1. 是否使用`Vue.use(Vuex)`来初始化
2. 当前浏览器是否支持`Promise`
3. 是否对当前构造函数进行了实例化

```
const {
  plugins = [],
  strict = false
} = options
```
从对象中取出选项, 定义了`Store`的一些选项, 比如严格模式, 插件.
```
let {
  state = {}
} = options
if (typeof state === 'function') {
  state = state()
}
```
全局状态树. 一个`Stroe`实例应该只有一个`state`状态树, 即**单一状态树**

```
this._committing = false
this._actions = Object.create(null)
this._mutations = Object.create(null)
this._wrappedGetters = Object.create(null)
this._modules = new ModuleCollection(options)
this._modulesNamespaceMap = Object.create(null)
this._subscribers = []
this._watcherVM = new Vue()
```
* `_committing` 提交状态. 确保 state 不被非法修改
* `_actions` 保存所有的 actions
* `_mutations` 保存所有的 mutations
* `_wrappedGetters` 保存所有的 getters
* `_modules` 保存所有的模块
* `_modulesNamespaceMap` 保存开启命名空间的模块
* `_subscribers` 存储所有 mutations 变化的订阅者
* `_watcherVM`  watch 实例. 通过新建一个`Vue`实例, 利用`watch`来监听数据

```
const store = this
const { dispatch, commit } = this
this.dispatch = function boundDispatch (type, payload) {
  return dispatch.call(store, type, payload)
}
this.commit = function boundCommit (type, payload, options) {
  return commit.call(store, type, payload, options)
}
```
将 `dispatch` 和 `commit` 两个方法强制性绑定到当前实例上  
这样通过 `const {dispatch, commit} = Store`, 能直接调用这两个方法

```
this.strict = strict
installModule(this, state, [], this._modules.root)
resetStoreVM(this, state)
plugins.forEach(plugin => plugin(this))
if (Vue.config.devtools) {
  devtoolPlugin(this)
}
```
这里集中设置了严格模式, 并按顺序安装模块, 初始化`store`, 安装插件, 并调用`devtool`

### `installModule`方法
`Store`通过`installModule`来对传入的模块进行注册和安装,

```
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

  // 开启命名空间时, 注册命名空间的模块
  if (module.namespaced) {
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  // 非根路径
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
```
`getNamespace`获取当前路径下的命名空间
```
getNamespace (path) {
  let module = this.root
  return path.reduce((namespace, key) => {
    module = module.getChild(key)
    // 有则添加 namespace/
    return namespace + (module.namespaced ? key + '/' : '')
  }, '')
}
```

`getNestedState`获取嵌套的状态, 通过`state`和`path`数组, 来获取对应嵌套的 `state`.  
因为`store`为单一状态树, 为了保证每个模块的`state`里数据不冲突,`vuex`将模块的`state`放到根`state`对应的模块名下.  
因此需要这个助手方法来快速获取对应路径的`state`
```
function getNestedState (state, path) {
  return path.length
    ? path.reduce((state, key) => state[key], state)
    : state
}
```

`_withCommit`方法, 是 `Store`的一个原型方法
```
_withCommit (fn) {
  const committing = this._committing
  this._committing = true
  fn()
  this._committing = committing
}
```
这个方法, 保证在提交标记为 true的时候**提交**

`makeLocalContext`. 返回当前的上下文
```
function makeLocalContext (store, namespace, path) {
  const noNamespace = namespace === ''

  const local = {
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
```
这个方法旨在根据不同的条件下(主要还是是否开启命名空间), 返回出兼容命名空间的操作方法.(`dispatch`, `commit`, `getters`, `state`).  
`unifyObjectStyle` 这个方法接受 `type`, `payload`以及`options`, 原本的`type`有可能为`string`类型或`object`, 该函数做了处理, 返回出一致的数据.  
`dispatch`, `commit`中, 根据是否有命名空间, 来拼接出正确的命名空间, 然后在`_actions`或`_mutations`中查找. 找到并执行  
`getters`则在有命名空间的情况下, 调用了`makeLocalGetters`, 该函数如下
```
function makeLocalGetters (store, namespace) {
  const gettersProxy = {}
  const splitPos = namespace.length
  Object.keys(store.getters).forEach(type => {
    // 当获取到的 getters 不符合命名空间时候跳过
    if (type.slice(0, splitPos) !== namespace) return
    // 提取当前的 getters
    const localType = type.slice(splitPos)

    // 重新定义, 返回当前方法
    Object.defineProperty(gettersProxy, localType, {
      get: () => store.getters[type],
      enumerable: true
    })
  })

  return gettersProxy
}
```
`state`则直接返回嵌套的方法.

```
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
```
以上是对模块里的 `mutation`, `actions`, `getter`进行注册, 利用了模块里定义的`forEach***`的方法, 来循环处理注册.每种注册的处理逻辑都是不一样, 也是关键的地方. 决定了`Vuex`中是如何实现这些的.
```
function registerMutation (store, type, handler, local) {
  // mutations 为一个数组, 里面包括所有模块中重名的 mutation.
  // 从而实现调用一次 mutations, 调用所有模块中的 mutation
  const entry = store._mutations[type] || (store._mutations[type] = [])
  entry.push(function wrappedMutationHandler (payload) {
    // mutation 只能处理本地的 state
    handler.call(store, local.state, payload)
  })
}
```
`registerMutation`注册`mutation`, 其实就是在`Store._mutations`中将一个封装好的方法传入进数组. 并且对处理方法进行了封装, 仅接受本地的`state`和参数

```
function registerAction (store, type, handler, local) {
  // actions 为一个数组, 包含所有模块重名的 action.
  // 从而实现调用一次 actions, 触发所有模块的 action
  const entry = store._actions[type] || (store._actions[type] = [])
  entry.push(function wrappedActionHandler (payload, cb) {
    // 第一个参数为上下文, 传入的数据, 保证能从本地或全局中获取状态或 getters
    let res = handler.call(store, {
      dispatch: local.dispatch,
      commit: local.commit,
      getters: local.getters,
      state: local.state,
      rootGetters: store.getters,
      rootState: store.state
    }, payload, cb)
    // 判断是否为 Promise, 保证返回的为 Promise
    if (!isPromise(res)) {
      res = Promise.resolve(res)
    }
    if (store._devtoolHook) {
      // 有 devtool 工具则监听报错信息
      return res.catch(err => {
        // 有报错则触发 error
        store._devtoolHook.emit('vuex:error', err)
        throw err
      })
    } else {
      // 返回 Promise
      return res
    }
  })
}
```
`registerAction`注册`action`, 类似之前的`registerMutation`, 同样在`Store._mutations`定义数组, 并且将封装好的方法传进数组. 不过有所区别的是, `action`被定义为异步操作, 所以`action`被封装成`Promise`, 并且总是返回`Promise`

```
function registerGetter (store, type, rawGetter, local) {
  // getters 不允许全局重名. 不然 vuex 也不好确定要返回哪个模块的 getter
  if (store._wrappedGetters[type]) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate getter key: ${type}`)
    }
    return
  }
  store._wrappedGetters[type] = function wrappedGetter (store) {
    // getters 允许从本地或全局获取 state 或 getters
    return rawGetter(
      local.state, // local state
      local.getters, // local getters
      store.state, // root state
      store.getters // root getters
    )
  }
}
```
`registerGetter`注册`getter`, 仅允许一个只有一个`getter`, 不允许重名. 并且将对应的`Store._wrappedGetters`包装好并返回

```
// 循环注册模块
module.forEachChild((child, key) => {
  installModule(store, rootState, path.concat(key), child, hot)
})
```
模块安装完成之后, 还要对当前模块的子模块进行循环注册安装

### `resetStoreVM`方法
初始化`Store`实例中的私有`Vue`实例
```
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm
  // 清空getters
  store.getters = {}
  const wrappedGetters = store._wrappedGetters
  // 可计算属性
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => {
    // 从老的 getters 上复制到新的 getters
    computed[key] = () => fn(store)
    Object.defineProperty(store.getters, key, {
      // 复制方法
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })
  const silent = Vue.config.silent
  // 取消所有的日志和警告
  Vue.config.silent = true
  // 将实例的单一状态树作为Vue的 data.
  // getters 作为可计算.
  // 从而实现监听数据
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent
  // 开启严格模式
  if (store.strict) {
    enableStrictMode(store)
  }
  if (oldVm) {
    if (hot) {
      // 强制性清空旧的state. 通过 vue 的 watch. 清空掉 getters 上老的依赖
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    // 摧毁
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```
`resetStoreVM`中可看出, `Vuex`的数据实现类似`Vue`的响应, 是通过将状态树作为`Vue`的数据, 去实例化. 而`getters`也作为计算属性, 也同时拥有了响应式.

```
function enableStrictMode (store) {
  // 直接利用 Vue 的 watch 监听所有值的变化.
  store._vm.$watch(function () { return this._data.$$state }, () => {
    if (process.env.NODE_ENV !== 'production') {
      // 当值有变化时, 判断是否允许提交. 不允许则直接提醒报错
      assert(store._committing, `Do not mutate vuex store state outside mutation handlers.`)
    }
  }, { deep: true, sync: true })
}
```
`enableStrictMode`严格模式, 对`Store`的私有`Vue`实例上所有的数据进行观察, 有变化且提交标记为`false`时, 将会打印报错信息. 对性能影响大

### `plugins`插件系统
```
plugins.forEach(plugin => plugin(this))
if (Vue.config.devtools) {
  devtoolPlugin(this)
}
```
引用插件, 插件中第一个参数则是实例本身, 可供调用所有属性或函数.

插件可通过`Store`的实例, 来获取数据, 比如`state`获取状态, `getters`获取计算属性. 因为`state`和`getters`的响应式, 插件在引用这些数据时, 需要进行深复制, 严防数据被篡改.  
插件可利用`Store.subscribe`函数来进行订阅, 可监听到所有的`mutation`执行

### `Store`原型方法

#### `state`
```
get state () {
  return this._vm._data.$$state
}
set state (v) {
  if (process.env.NODE_ENV !== 'production') {
    assert(false, `Use store.replaceState() to explicit replace store state.`)
  }
}
```
`Store.state`获取数据, 会默认从实例的私有`vm`中读取数据. 而设置数据时, 做了限定, 不允许直接去替换数据

#### `commit`提交
```
commit (_type, _payload, _options) {
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
```
`commit`, 先取出正确的值, 并查找对应的入口, 提交时, 修改提交状态, 防止报错. 同时通知所有订阅者.

#### `dispatch`调度
```
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
```
`dispatch`, 取出正确的值, 并查找入口, 在调度时, 返回一个`Promise`, 保证所有被调用的`action`都已经处于完成状态.

#### `subscribe` 订阅
```
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
```
订阅, 往实例的订阅者数组中推入回调. 等待`commit`时触发.

#### `watch`
```
watch (getter, cb, options) {
  if (process.env.NODE_ENV !== 'production') {
    assert(typeof getter === 'function', `store.watch only accepts a function.`)
  }
  return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
}
```
观察, 响应式地监测一个`getter`方法的返回值. 作为API暴露出来供开发者使用

#### `replaceState`
```
replaceState (state) {
  this._withCommit(() => {
    this._vm._data.$$state = state
  })
}
```
直接替换掉`Store`全部的状态

#### `registerModule`
```
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
```
`registerModule`注册模块. API

#### `unregisterModule`
```
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
```
`registerModule`卸载模块. API

#### `hotUpdate`
```
hotUpdate (newOptions) {
  this._modules.update(newOptions)
  resetStore(this, true)
}
```
热重载 `action`和`mutation`

### 其它方法
#### `resetStore`
```
function resetStore (store, hot) {
  // 所有都清空掉
  store._actions = Object.create(null)
  store._mutations = Object.create(null)
  store._wrappedGetters = Object.create(null)
  store._modulesNamespaceMap = Object.create(null)
  const state = store.state
  // 安装所有模块
  installModule(store, state, [], store._modules.root, true)
  // 重置 vm
  resetStoreVM(store, state, hot)
}
```
清空掉当前实例下的所有数据, 并重新安装模块, 重置 实例

## 模块
`Vuex`中关于模块的有两个文件, module.js 和 module-collection.js

* module.js 导出`Module`类, 负责实例化传入的模块
* module-collection.js 模块集合类, 负责处理实例化后的模块

先从模块开始.
### `Module`
#### 构造函数
```
constructor (rawModule, runtime) {
  this.runtime = runtime
  this._children = Object.create(null)
  this._rawModule = rawModule
  const rawState = rawModule.state
  this.state = (typeof rawState === 'function' ? rawState() : rawState) || {}
}
```
模块的构造函数很简单, 就是定义了运行时状态, 子模块, 原数据以及状态.

#### 属性或方法
* `namespaced` 只有`get`方法, 返回当前模块是否开启命名空间
* `addChild` 添加子模块
* `removeChild` 移除子模块
* `getChild` 获取子模块
* `update` 更新子模块. 不会采用直接更新整个模块的方式, 而是按照属性更新过来. 防止更新时移除掉其它属性
* `forEach****` 会对模块对应的属性进行循环操作, 通过传入的函数去操作
  1. `forEachChild` 子模块
  2. `forEachGetter` getters
  3. `forEachAction` actions
  4. `forEachMutation` mutations

### `ModuleCollection`
模块集合, 这个用来处理模块
#### 构造方法
```
constructor (rawRootModule) {
  // 注册模块. 收集模块
  this.register([], rawRootModule, false)
}
```
实例化后在根路径下注册了一个`root`模块

#### `get`
```
// 通过路径 获取模块
get (path) {
  // 利用 reduce 来解析路径
  return path.reduce((module, key) => {
    return module.getChild(key)
  }, this.root)
}
```
根据传入的路径数组, 利用`reduce`返回出正确的对应的模块

#### `getNamespace`
```
getNamespace (path) {
  let module = this.root
  return path.reduce((namespace, key) => {
    module = module.getChild(key)
    // 有则添加 /
    return namespace + (module.namespaced ? key + '/' : '')
  }, '')
}
```
根据传入的路径数组, 利用`reduce`, 获取对应的模块名(`****/****`)

#### `update`
```
update (rawRootModule) {
  update([], this.root, rawRootModule)
}
```
更新模块. 该函数里调用了`update`函数, 封装了模块的更新方法
```
function update (path, targetModule, newModule) {
  if (process.env.NODE_ENV !== 'production') {
    // 断言判断是否符合模块
    assertRawModule(path, newModule)
  }
  // 更新需要被替换的模块
  targetModule.update(newModule)
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
```
`update`函数中, 调用了`Module`的原型方法`update`来更新模块, 并同时将其子模块里的模块全部都执行`update`操作

#### `register`
```
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
  // 如果该模块上还有子模块的话, 将循环调用 register 进行注册模块
  if (rawModule.modules) {
    forEachValue(rawModule.modules, (rawChildModule, key) => {
      this.register(path.concat(key), rawChildModule, runtime)
    })
  }
}
```
注册模块. 先判断模块是否正确, 而后实例化为`Module`, 判断路径, 将模块放到对应的子模块中. 并对当前的模块的子模块进行循环注册

```
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
```
`register`函数中提到的`assertRawModule`本体, 直接判断模块下的三个方法属性中的值是否为方法. 并通过`makeAssertionMessage`来创造一致性的错误信息.
```
function makeAssertionMessage (path, key, type, value) {
  let buf = `${key} should be function but "${key}.${type}"`
  if (path.length > 0) {
    buf += ` in module "${path.join('.')}"`
  }
  buf += ` is ${JSON.stringify(value)}.`

  return buf
}
```

#### `unregister`
```
unregister (path) {
  const parent = this.get(path.slice(0, -1))
  const key = path[path.length - 1]
  if (!parent.getChild(key).runtime) return
  // 移除子模块
  parent.removeChild(key)
}
```
取消注册很简单, 直接去对应的父模块上, 将当前模块从其子模块上移除

## 助手方法
`Vuex`的`helpers.js`中, 定义了一些辅助方法. 用来将`Vuex`的状态, `getters`, `commit` 或 `dispatch`快速展开到`Vue`的`computed`或`methdos`  
这些助手方法基本都允许接受一个数组或一个对象. 并分别正确的处理. 助手方法有以下四种:
1. `mapState`
2. `mapMutations`
3. `mapGetters`
4. `mapActions`

四种助手方法, 均用了`normalizeNamespace`, `normalizeMap` 和 `getModuleByNamespace`. 先从这三个方法入手.

### `normalizeNamespace`
```
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}
```
`normalizeNamespace`接受个方法, 并返回一个封装好的方法. 返回的方法, 会将`namespace`以及集合都处理完成, 再将一开始传入的回调进行处理这些数据.


### `normalizeMap`
```
function normalizeMap (map) {
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}
```
`normalizeMap`会将传入的对象或数组, 转为一个包含 `{key: xx, value: yy}`的数组集合. 方便处理  
专门用来处理助手函数可接受数组或对象的方法.

### `getModuleByNamespace`
```
function getModuleByNamespace (store, helper, namespace) {
  const module = store._modulesNamespaceMap[namespace]
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`)
  }
  return module
}
```
从实例的`_modulesNamespaceMap`命名空间模块映射上查找对应命名空间的模块, 并返回找到的模块


### `mapState`
```
export const mapState = normalizeNamespace((namespace, states) => {
  // 这个对象用来接受Vue中调用助手函数后的进行加工封装
  const res = {}
  // 将states处理成标准的键值对.
  normalizeMap(states).forEach(({ key, val }) => {
    // 因为 computed 接受的键值对, 值为方法. 因此这里需要将 state 定义为方法.
    res[key] = function mappedState () {
      // 这里的上下文其实已经在 Vue 中的 computed里了. 所以直接通过 $store 来获取 store
      let state = this.$store.state
      let getters = this.$store.getters
      if (namespace) {
        // 查找模块
        const module = getModuleByNamespace(this.$store, 'mapState', namespace)
        if (!module) {
          return
        }
        state = module.context.state
        getters = module.context.getters
      }
      // 返回值
      return typeof val === 'function'
        // 当传入的是方法时, 则第一参数为 state. mapState({count: state => state.count})
        ? val.call(this, state, getters)
        : state[val]
    }
    // mark vuex getter for devtools
    // 标记为 vuex
    res[key].vuex = true
  })
  // 将对象暴露出去
  return res
})
```

### `mapMutations`
```
export const mapMutations = normalizeNamespace((namespace, mutations) => {
  const res = {}
  // 展开mutations 为标准键值对
  normalizeMap(mutations).forEach(({ key, val }) => {
    val = namespace + val
    // 方法中, 键名为方法名, 键值为方法本身
    res[key] = function mappedMutation (...args) {
      // 查找
      if (namespace && !getModuleByNamespace(this.$store, 'mapMutations', namespace)) {
        return
      }
      // 调用commit
      return this.$store.commit.apply(this.$store, [val].concat(args))
    }
  })
  return res
})
```

### `mapGetters`
```
export const mapGetters = normalizeNamespace((namespace, getters) => {
  const res = {}
  // 展开getters为标准键值对
  normalizeMap(getters).forEach(({ key, val }) => {
    val = namespace + val
    // 可计算属性的值可为方法. 这里通过方法去定义
    res[key] = function mappedGetter () {
      // 查找模块
      if (namespace && !getModuleByNamespace(this.$store, 'mapGetters', namespace)) {
        return
      }
      // 查找方法
      if (process.env.NODE_ENV !== 'production' && !(val in this.$store.getters)) {
        console.error(`[vuex] unknown getter: ${val}`)
        return
      }
      // 返回对应的值
      return this.$store.getters[val]
    }
    // mark vuex getter for devtools
    // 标记
    res[key].vuex = true
  })
  return res
})
```

### `mapActions`
```
export const mapActions = normalizeNamespace((namespace, actions) => {
  const res = {}
  // 展开actions为标准键值对
  normalizeMap(actions).forEach(({ key, val }) => {
    val = namespace + val
    res[key] = function mappedAction (...args) {
      // 查找模块
      if (namespace && !getModuleByNamespace(this.$store, 'mapActions', namespace)) {
        return
      }
      return this.$store.dispatch.apply(this.$store, [val].concat(args))
    }
  })
  return res
})
```

以上的四种助手方法都比较抽象, 但是掌握了他的上下文, 其实并不难. 都是将传入的数组或对象, 进行处理. 并返回展开的对象. 这个对象的键名都为函数名或值名, 值为函数. 作为值的函数, 其上下文都是`Vue`实例中的上下文, 因此都直接调用了 `this.$store`来对值进行访问, 比如`state`或`getter`, 或提交或调用. 比如`commit`, `dispatch`.

### 其它方法
#### `createNamespacedHelpers`
```
export const createNamespacedHelpers = (namespace) => ({
  mapState: mapState.bind(null, namespace),
  mapGetters: mapGetters.bind(null, namespace),
  mapMutations: mapMutations.bind(null, namespace),
  mapActions: mapActions.bind(null, namespace)
})
```
根据命名空间,来创建对应的助手方法

## 总结
`Vuex`将`state`交给`Vue`处理, 并用`computed`来处理`getters`数据. 这就是为什么`Vuex`不能适用于除了`Vue`之外的其它框架  
在解读的过程中, 对`Vuex`的熟悉, 能很好的帮我读懂源码, 读了源码, 也让我更加理解`Vuex`的一些设计. 比如`action`为什么总是返回`Promise`, `commit`如何去通知其它插件.