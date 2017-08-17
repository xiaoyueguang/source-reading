/**
 * 本文件里包含辅助函数
 */
// state 辅助函数
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
// mutation 辅助函数
export const mapMutations = normalizeNamespace((namespace, mutations) => {
  const res = {}
  // 展开mutations为标准键值对
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
// getters 辅助函数
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
// actions 辅助函数
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
/**
 * 根据命名空间创建辅助
 * @param {string} namespace 命名空间
 */
export const createNamespacedHelpers = (namespace) => ({
  mapState: mapState.bind(null, namespace),
  mapGetters: mapGetters.bind(null, namespace),
  mapMutations: mapMutations.bind(null, namespace),
  mapActions: mapActions.bind(null, namespace)
})
/**
 * 展开 map. 辅助函数可以通过数组来展开, 也可通过对象来展开
 * @param {array|object} map 集合
 * @return {array} 一个包含键值对的 集合
 * 例子:
 *  normalizeMap([1,2]) => [{key:1, value:1}, {key:2, value:2}]
 *  normalizeMap({a: 1, b: 2}) => [{key: 'a', value: 1}, {key: 'b', value: 2}]
 */
function normalizeMap (map) {
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}
/**
 * 规范命名空间
 * @param {function} fn 
 */
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
/**
 * 通过命名空间获取模块
 * @param {Store} store 实例
 * @param {string} helper 辅助方法
 * @param {string} namespace 命名空间
 */
function getModuleByNamespace (store, helper, namespace) {
  const module = store._modulesNamespaceMap[namespace]
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`)
  }
  return module
}
