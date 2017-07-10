/**
 * A doubly linked list-based Least Recently Used (LRU)
 * cache. Will keep most recently used items while
 * discarding least recently used items when its limit is
 * reached. This is a bare-bone version of
 * Rasmus Andersson's js-lru:
 *
 *   https://github.com/rsms/js-lru
 *
 * @param {Number} limit
 * @constructor
 */

/**
 * 这里是引用了别人的 缓存库.
 * 这个缓存库很有意思.
 * 可以不停的往一个有限制的缓存库里塞数据.
 * 缓存库里会有一个维护的内容队列.
 * 当该内容被命中时, 他在队列里的优先级就越高, 不容易从缓存库中移除.
 */

function Cache (limit) {
  this.size = 0
  this.limit = limit
  this.head = this.tail = undefined
  this._keymap = Object.create(null)
}

var p = Cache.prototype

/**
 * Put <value> into the cache associated with <key>.
 * Returns the entry which was removed to make room for
 * the new entry. Otherwise undefined is returned.
 * (i.e. if there was enough room already).
 * Put 数据的时候会对数据检查, 超出的将会被移除
 * @param {String} key
 * @param {*} value
 * @return {Entry|undefined}
 */

p.put = function (key, value) {
  var entry = {
    key: key,
    value: value
  }
  this._keymap[key] = entry
  if (this.tail) {
    this.tail.newer = entry
    entry.older = this.tail
  } else {
    this.head = entry
  }
  this.tail = entry
  if (this.size === this.limit) {
    return this.shift()
  } else {
    this.size++
  }
}

/**
 * Purge the least recently used (oldest) entry from the
 * cache. Returns the removed entry or undefined if the
 * cache was empty.
 * 移除最旧的缓存
 */

p.shift = function () {
  var entry = this.head
  if (entry) {
    this.head = this.head.newer
    this.head.older = undefined
    entry.newer = entry.older = undefined
    this._keymap[entry.key] = undefined
  }
  return entry
}

/**
 * Get and register recent use of <key>. Returns the value
 * associated with <key> or undefined if not in cache.
 *
 * @param {String} key
 * @param {Boolean} returnEntry
 * @return {Entry|*}
 * 获取数据. 获取数据的时候会导致该数据的优先级变高
 */

p.get = function (key, returnEntry) {
  var entry = this._keymap[key]
  if (entry === undefined) return
  if (entry === this.tail) {
    return returnEntry
      ? entry
      : entry.value
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry.newer) {
    if (entry === this.head) {
      this.head = entry.newer
    }
    entry.newer.older = entry.older // C <-- E.
  }
  if (entry.older) {
    entry.older.newer = entry.newer // C. --> E
  }
  entry.newer = undefined // D --x
  entry.older = this.tail // D. --> E
  if (this.tail) {
    this.tail.newer = entry // E. <-- D
  }
  this.tail = entry
  return returnEntry
    ? entry
    : entry.value
}

module.exports = Cache
