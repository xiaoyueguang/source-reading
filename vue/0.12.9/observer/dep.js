/**
 * 依赖管理
 */
var _ = require('../util')

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 可订阅的依赖
 *
 * @constructor
 */

function Dep () {
  // 指令集合. 需要通知的指令
  this.subs = []
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// 任意时候只有一个观察者目标
Dep.target = null

var p = Dep.prototype

/**
 * Add a directive subscriber.
 * 添加需要通知的指令
 *
 * @param {Directive} sub
 */

p.addSub = function (sub) {
  this.subs.push(sub)
}

/**
 * Remove a directive subscriber.
 * 移除需要通知的指令
 * @param {Directive} sub
 */

p.removeSub = function (sub) {
  this.subs.$remove(sub)
}

/**
 * Add self as a dependency to the target watcher.
 * 将自身添加到目标依赖中.
 */

p.depend = function () {
  Dep.target.addDep(this)
}

/**
 * Notify all subscribers of a new value.
 * 通知 更新依赖
 */

p.notify = function () {
  // stablize the subscriber list first
  var subs = _.toArray(this.subs)
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update()
  }
}

module.exports = Dep
