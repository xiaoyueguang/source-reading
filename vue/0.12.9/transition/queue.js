/**
 * 队列执行过渡
 */
var _ = require('../util')
var queue = []
var queued = false

/**
 * Push a job into the queue.
 * 待执行的回调推入队列
 * @param {Function} job
 */

exports.push = function (job) {
  queue.push(job)
  if (!queued) {
    queued = true
    _.nextTick(flush)
  }
}

/**
 * Flush the queue, and do one forced reflow before
 * triggering transitions.
 * 冲刷队列
 */

function flush () {
  // Force layout
  var f = document.documentElement.offsetHeight
  // 循环后一个个执行
  for (var i = 0; i < queue.length; i++) {
    queue[i]()
  }
  queue = []
  queued = false
  // dummy return, so js linters don't complain about
  // unused variable f
  return f
}
