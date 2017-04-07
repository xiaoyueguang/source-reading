/**
 * 队列.批处理执行方法.
 * 每次执行完毕后, 将会清空队列.
 */
var utils = require('./utils')
/**
 * 构造函数.
 * 清空私有队列
 */
function Batcher () {
    this.reset()
}

var BatcherProto = Batcher.prototype
/**
 * 插入任务.
 * @params job
 *          id          ID
 *          override    是否覆盖
 *          execute     执行的回调方法
 *
 * 插入任务的时候 会判断是否存在任务, 以及 任务是否在执行.
 * 存在任务且 override 为 true, 则将原任务标记为取消.
 */
BatcherProto.push = function (job) {
    if (!job.id || !this.has[job.id]) {
        this.queue.push(job)
        this.has[job.id] = job
        if (!this.waiting) {
            this.waiting = true
            // 异步执行, 防止阻塞住当前任务.
            utils.nextTick(utils.bind(this.flush, this))
        }
    } else if (job.override) {
        // 覆盖. 将原对象 标记为 清除状态. 且替换新的对象.
        var oldJob = this.has[job.id]
        oldJob.cancelled = true
        this.queue.push(job)
        this.has[job.id] = job
    }
}
/**
 * 冲洗任务
 */
BatcherProto.flush = function () {
    // before flush hook
    // 先执行 可能存在的钩子
    if (this._preFlush) this._preFlush()
    // do not cache length because more jobs might be pushed
    // as we execute existing jobs
    /**
     * 不缓存length. 因为 队列里 执行任务的时, 有可能还没执行完.
     * 队列里可能还会继续添加新的任务. 因此这里将实时获取任务长度.
     * 确保所有任务都将会被执行一遍.
     */
    for (var i = 0; i < this.queue.length; i++) {
        var job = this.queue[i]
        // 只执行 没被设置取消的 任务
        if (!job.cancelled) {
            job.execute()
        }
    }
    // 执行完毕后清空
    this.reset()
}
/**
 * 重置
 */
BatcherProto.reset = function () {
    // 缓存 id 以及对应的方法
    // 对象用来查找 ID对应的内容, 以及进行操作. 方便取消执行
    this.has = utils.hash()
    // 执行队列
    // 数组 用来执行 ID对应的方法
    this.queue = []
    // 状态
    this.waiting = false
}

module.exports = Batcher