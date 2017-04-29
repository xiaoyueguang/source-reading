var Batcher        = require('./batcher'),
    bindingBatcher = new Batcher(),
    bindingId      = 1
    
/**
 *  Binding class.
 *
 *  each property on the viewmodel has one corresponding Binding object
 *  which has multiple directive instances on the DOM
 *  and multiple computed property dependents
 * 捆绑类.
 * 将指令, 以及 监听全部都连接起来.
 * 因此, 在值更新之后, 可通知到 vue 更新调用指令的update方法.
 * @param {object|compiler} compiler 
 * @param {string} key 表达式. 或 变量字符串
 *                  | 当以下的 isExp为false. 即非表达式.
 *                  | 则该字段表示为变量path.
 * @param {boolean} isExp 是否为表达式
 * @param {boolean} isFn 是否为方法
 */
function Binding (compiler, key, isExp, isFn) {
    // binding的uuid
    this.id = bindingId++
    // 默认值为空
    this.value = undefined
    // 是否表达式
    this.isExp = !!isExp
    // 是否为方法
    this.isFn = isFn
    // 当为非表达式, 且变量path里没有 . 时候. 表明该变量所指的值在根上
    this.root = !this.isExp && key.indexOf('.') === -1
    // 编译器
    this.compiler = compiler
    // key值
    this.key = key
    // 指令集合. 该值更新后 所需要通知的指令
    this.dirs = []
    // 对应的值的监听数组
    this.subs = []
    // 当 deps里的指令更新后, 会通知到本指令
    this.deps = []
    // 绑定状态值. 一开始设置为绑定.
    this.unbound = false
}

var BindingProto = Binding.prototype

/**
 *  Update value and queue instance updates.
 * 绑定更新.
 */
BindingProto.update = function (value) {
    // 判断是否为可计算.或者方法
    if (!this.isComputed || this.isFn) {
        this.value = value
    }
    // 如果存在收集到的指令 或 监听...
    // 则将任务推送进 批处理的队列里.
    if (this.dirs.length || this.subs.length) {
        var self = this
        bindingBatcher.push({
            id: this.id,
            execute: function () {
                // 推入批处理
                if (!self.unbound) {
                    self._update()
                }
            }
        })
    }
}

/**
 *  Actually update the directives.
 * 对指令执行更新操作.
 */
BindingProto._update = function () {
    var i = this.dirs.length,
        value = this.val()
    while (i--) {
        // 更新指令集合里的值
        this.dirs[i].update(value)
    }
    // 本身指令更新后, 需要派发到其它指令更新指令
    this.pub()
}

/**
 *  Return the valuated value regardless
 *  of whether it is computed or not
 * 返回值.
 */
BindingProto.val = function () {
    return this.isComputed && !this.isFn
        ? this.value.$get()
        : this.value
}

/**
 *  Notify computed properties that depend on this binding
 *  to update themselves
 * 通知依赖. 调用该方法可通知 vue 将 subs数组里的监听的指令方法, 全部更新
 * 然后当值变化后, 批量更新 subs 数组里的指令, 进行批量更新
 */
BindingProto.pub = function () {
    var i = this.subs.length
    while (i--) {
        // 通知 该指令集合里的指令 进行值更新
        this.subs[i].update()
    }
}

/**
 *  Unbind the binding, remove itself from all of its dependencies
 * 解除绑定. 将所有的依赖关系 进行解除绑定
 */
BindingProto.unbind = function () {
    // Indicate this has been unbound.
    // It's possible this binding will be in
    // the batcher's flush queue when its owner
    // compiler has already been destroyed.
    // 指令状态 改为解绑
    this.unbound = true
    var i = this.dirs.length
    while (i--) {
        // 解绑 需要对指令集里的指令进行解绑.
        this.dirs[i].unbind()
    }
    i = this.deps.length
    var subs
    while (i--) {
        subs = this.deps[i].subs
        // 监听该指令的指令里移除对该指令的监听
        subs.splice(subs.indexOf(this), 1)
    }
}

module.exports = Binding