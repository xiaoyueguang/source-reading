/**
 * 批处理
 */
var _ = require('./util')
var config = require('./config')

// we have two separate queues: one for directive updates
// and one for user watcher registered via $watch().
// we want to guarantee directive updates to be called
// before user watchers so that when user watchers are
// triggered, the DOM would have already been in updated
// state.
/**
 * 现在升级到两个单独的队列了.
 * 一个是用来执行指令的队列
 * 一个是用户 watcher 的队列
 * 这是为了保证在 在执行 watcher 队列之前能先执行完指令的队列
 */
var queue = []
var userQueue = []
var has = {}
var circular = {}
var waiting = false
var internalQueueDepleted = false

/**
 * Reset the batcher's state.
 * 更新复位
 */

function reset () {
  queue = []
  userQueue = []
  has = {}
  circular = {}
  waiting = internalQueueDepleted = false
}

/**
 * Flush both queues and run the watchers.
 * 重刷队列
 */

function flush () {
  run(queue)
  internalQueueDepleted = true
  run(userQueue)
  reset()
}

/**
 * Run the watchers in a single queue.
 * 重刷对类
 * @param {Array} queue
 */

function run (queue) {
  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (var i = 0; i < queue.length; i++) {
    var watcher = queue[i]
    var id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    // 这里的警告是为了防止 watcher 重刷的时候 循环次数过高. 导致性能损耗太大.
    // 当出现这种情况时, 说明编写的 watch 有问题, 得优化
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > config._maxUpdateCount) {
        queue.splice(has[id], 1)
        _.warn(
          'You may have an infinite update loop for watcher ' +
          'with expression: ' + watcher.expression
        )
      }
    }
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 将程序推入 队列, 已经重复定义过的 ID 讲被跳过
 *
 * @param {Watcher} watcher
 *   properties:
 *   - {Number} id
 *   - {Function} run
 */

exports.push = function (watcher) {
  var id = watcher.id
  if (has[id] == null) {
    // if an internal watcher is pushed, but the internal
    // queue is already depleted, we run it immediately.
    if (internalQueueDepleted && !watcher.user) {
      watcher.run()
      return
    }
    // push watcher into appropriate queue
    var q = watcher.user ? userQueue : queue
    has[id] = q.length
    q.push(watcher)
    // queue the flush
    if (!waiting) {
      waiting = true
      // 程序总是在推入到队列后, 才异步执行
      _.nextTick(flush)
    }
  }
}
