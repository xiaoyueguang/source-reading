/**
 * Get the first item that pass the test
 * by second argument function
 * 查找方法.. 返回找到的第一个
 * 
 * @param {Array} list
 * @param {Function} f
 * @return {*}
 */
function find (list, f) {
  return list.filter(f)[0]
}

/**
 * Deep copy the given object considering circular structure.
 * This function caches all nested objects and its copies.
 * If it detects circular structure, use cached copy to avoid infinite loop.
 * 深度复制
 * 
 * @param {*} obj
 * @param {Array<Object>} cache
 * @return {*}
 */
export function deepCopy (obj, cache = []) {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  // 当对象被找到时, 直接返回对象的复制
  const hit = find(cache, c => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  // 将内容推送到 cache 中.递归复制时直接从 cache 中拿
  cache.push({
    original: obj,
    copy
  })
  // 将值复制给对象或数组的属性中. 实现深度复制
  Object.keys(obj).forEach(key => {
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}

/**
 * forEach for object
 * 循环处理对象或数组
 */
export function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}
// 判断是否为对象
export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}
// 判断传参是否为 Promise
export function isPromise (val) {
  return val && typeof val.then === 'function'
}
// 断言
export function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}
