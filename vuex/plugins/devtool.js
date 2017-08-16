/**
 * devtool 插件
 */
const devtoolHook =
  typeof window !== 'undefined' &&
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__

export default function devtoolPlugin (store) {
  if (!devtoolHook) return
  // 在整个 store 上挂载对象.方便调用
  store._devtoolHook = devtoolHook
  // 初始化
  devtoolHook.emit('vuex:init', store)
  // 监听时间旅行
  devtoolHook.on('vuex:travel-to-state', targetState => {
    // 替换 state来实现时间旅行
    store.replaceState(targetState)
  })
  // 观察者订阅, 订阅 store, 当有触发 mutation 时, 直接调用devtool钩子
  store.subscribe((mutation, state) => {
    devtoolHook.emit('vuex:mutation', mutation, state)
  })
}
