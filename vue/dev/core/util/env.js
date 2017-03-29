/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'

// can we use __proto__?
// 是否拥有 __proto__
export const hasProto = '__proto__' in {}

// Browser environment sniffing
// 嗅探浏览器环境
export const inBrowser = typeof window !== 'undefined'
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && /msie|trident/.test(UA)
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isEdge = UA && UA.indexOf('edge/') > 0
export const isAndroid = UA && UA.indexOf('android') > 0
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA)
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
// 是否为服务器端渲染
let _isServer
export const isServerRendering = () => {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }
  }
  return _isServer
}

// detect devtools
// 检查是否有 devtools. chrome 开启vue开发者插件后 会有个 全局钩子 供JS调用
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
// 判断方法是否为浏览器自带
export function isNative (Ctor: Function): boolean {
  return /native code/.test(Ctor.toString())
}
// 判断是否有 Symbol
export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)

/**
 * Defer a task to execute it asynchronously.
 * 延迟执行一个命令.在DOM更新完成后 执行该方法.
 */
export const nextTick = (function () {
  const callbacks = []
  let pending = false
  let timerFunc
  // 更新完成后, 执行回调队列里的方法.
  function nextTickHandler () {
    pending = false
    const copies = callbacks.slice(0)
    callbacks.length = 0
    for (let i = 0; i < copies.length; i++) {
      copies[i]()
    }
  }

  // the nextTick behavior leverages the microtask queue, which can be accessed
  // via either native Promise.then or MutationObserver.
  // MutationObserver has wider support, however it is seriously bugged in
  // UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
  // completely stops working after triggering a few times... so, if native
  // Promise is available, we will use it:
  /* istanbul ignore if */
  /**
   * 本来 MutationObserver 可以很好的去监听. 但是在IOS9.3.3上表现不一致.
   * 导致 Vue 1.0.24上, 更新VUE后会导致错误.
   * 因此 先默认用 Promise.
   * 在低版本上机子上, 再采用 MutationObserver, 来避开该错误.
   * 只有当两种方式都不允许时, 只能采用最低级的方式, setTimeout 去触发. 
   * 该方式的性能也是最差的
   */
  if (typeof Promise !== 'undefined' && isNative(Promise)) {
    var p = Promise.resolve()
    var logError = err => { console.error(err) }
    timerFunc = () => {
      p.then(nextTickHandler).catch(logError)
      // in problematic UIWebViews, Promise.then doesn't completely break, but
      // it can get stuck in a weird state where callbacks are pushed into the
      // microtask queue but the queue isn't being flushed, until the browser
      // needs to do some other work, e.g. handle a timer. Therefore we can
      // "force" the microtask queue to be flushed by adding an empty timer.
      /**
       * 在 IOS 的UIWebViews, Promise 会遇到一种奇怪的中止状态.
       * 导致回调不会继续下去. 因此通过 执行个空方法.
       * 来保证 Promise的then 能一直执行下去
       */
      if (isIOS) setTimeout(noop)
    }
  } else if (typeof MutationObserver !== 'undefined' && (
    isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]'
  )) {
    // use MutationObserver where native Promise is not available,
    // e.g. PhantomJS IE11, iOS7, Android 4.4
    /**
     * 当 Promise 不支持时, 则采用 MutationObserver
     */
    var counter = 1
    var observer = new MutationObserver(nextTickHandler)
    var textNode = document.createTextNode(String(counter))
    observer.observe(textNode, {
      characterData: true
    })
    timerFunc = () => {
      counter = (counter + 1) % 2
      textNode.data = String(counter)
    }
  } else {
    // fallback to setTimeout
    /* istanbul ignore next */
    /** 这是性能最差的实现 */
    timerFunc = () => {
      setTimeout(nextTickHandler, 0)
    }
  }
  /**
   * 返回一个闭包.
   * 将界面更新完成后的回调放入一个队列. 等页面更新完毕后, 再去执行.
   */
  return function queueNextTick (cb?: Function, ctx?: Object) {
    let _resolve
    callbacks.push(() => {
      if (cb) cb.call(ctx)
      if (_resolve) _resolve(ctx)
    })
    if (!pending) {
      pending = true
      timerFunc()
    }
    if (!cb && typeof Promise !== 'undefined') {
      return new Promise(resolve => {
        _resolve = resolve
      })
    }
  }
})()

let _Set
/* istanbul ignore if */
// 定义一个 Set. 兼容性
if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = class Set {
    set: Object;
    constructor () {
      this.set = Object.create(null)
    }
    has (key: string | number) {
      return this.set[key] === true
    }
    add (key: string | number) {
      this.set[key] = true
    }
    clear () {
      this.set = Object.create(null)
    }
  }
}

export { _Set }
