/**
 * 定义viewmodel 主要方法.
 * 编译, 并添加若干方法.
 */
var Compiler   = require('./compiler'),
    utils      = require('./utils'),
    transition = require('./transition'),
    Batcher    = require('./batcher'),
    slice      = [].slice,
    def        = utils.defProtected,
    nextTick   = utils.nextTick,

    // batch $watch callbacks
    watcherBatcher = new Batcher(),
    watcherId      = 1

/**
 *  ViewModel exposed to the user that holds data,
 *  computed properties, event handlers
 *  and a few reserved methods
 * ViewModel 暴露出用户传入的 data computed 定义的 methods方法
 * 以及 ViewModel的自身方法
 */
function ViewModel (options) {
    // just compile. options are passed directly to compiler
    // 编译选项
    new Compiler(this, options)
}

// All VM prototype methods are inenumerable
// so it can be stringified/looped through as raw data
var VMProto = ViewModel.prototype

/**
 *  Convenience function to get a value from
 *  a keypath
 * 定义 $get 方法.
 * 根据路径 来获取值
 */
def(VMProto, '$get', function (key, value) {
    return utils.get(this, key, value)
})

/**
 *  Convenience function to set an actual nested value
 *  from a flat key string. Used in directives.
 * 定义 $set 方法.
 * 根据路径 来设置值
 */
def(VMProto, '$set', function (key, value) {
    utils.set(this, key, value)
})

/**
 *  watch a key on the viewmodel for changes
 *  fire callback with new value
 * 定义 $watch 方法.
 * 观察值. 当值改变时 将触发 watch 队列
 */
def(VMProto, '$watch', function (key, callback) {
    // save a unique id for each watcher
    var id = watcherId++,
        self = this
    function on () {
        var args = slice.call(arguments)
        watcherBatcher.push({
            id: id,
            override: true,
            execute: function () {
                callback.apply(self, args)
            }
        })
    }
    // 在回调上添加引用. 方便取消 watch 时
    // 通过该引用取消对应的方法
    callback._fn = on
    self.$compiler.observer.on('change:' + key, on)
})

/**
 *  unwatch a key
 * 定义 $unwatch 方法.
 * 取消观察值.
 */
def(VMProto, '$unwatch', function (key, callback) {
    // workaround here
    // since the emitter module checks callback existence
    // by checking the length of arguments
    var args = ['change:' + key],
        ob = this.$compiler.observer
    if (callback) args.push(callback._fn)
    ob.off.apply(ob, args)
})

/**
 *  unbind everything, remove everything
 * 定义 $destroy 方法.
 * 生命周期. 调用摧毁方法
 */
def(VMProto, '$destroy', function () {
    this.$compiler.destroy()
})

/**
 *  broadcast an event to all child VMs recursively.
 * 定义 $broadcast 方法.
 * 从上往下, 广播事件
 * 触发 子组件的 事件. 以及继续从子组件上广播下去.
 * 从而广播到所有子组件, 以及触发对应的事件
 */
def(VMProto, '$broadcast', function () {
    var children = this.$compiler.children,
        i = children.length,
        child
    while (i--) {
        child = children[i]
        child.emitter.emit.apply(child.emitter, arguments)
        child.vm.$broadcast.apply(child.vm, arguments)
    }
})

/**
 *  emit an event that propagates all the way up to parent VMs.
 * 定义 $dispatch 方法
 * 从自身往上, 派发事件
 * 先触发自身的 事件.
 * 然后一级级往上查找 父组件, 依次触发事件.
 */
def(VMProto, '$dispatch', function () {
    var compiler = this.$compiler,
        emitter = compiler.emitter,
        parent = compiler.parent
    emitter.emit.apply(emitter, arguments)
    if (parent) {
        parent.vm.$dispatch.apply(parent.vm, arguments)
    }
})

/**
 *  delegate on/off/once to the compiler's emitter
 * 定义 $emit $on $off $once 方法.
 * 分别调用 观察者上的方法.
 */
;['emit', 'on', 'off', 'once'].forEach(function (method) {
    def(VMProto, '$' + method, function () {
        var emitter = this.$compiler.emitter
        emitter[method].apply(emitter, arguments)
    })
})

// DOM convenience methods
// DOM 方法
/**
 * 定义 $appendTo 方法
 * 将自身实例. 插入到目标里. 且执行过渡动画.
 */
def(VMProto, '$appendTo', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.appendChild(el)
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $remove 方法
 * 移除掉自身. 且执行过渡方法
 */
def(VMProto, '$remove', function (cb) {
    var el = this.$el
    transition(el, -1, function () {
        if (el.parentNode) {
            el.parentNode.removeChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $before 方法
 * 将 实例插入到 目标前. 且执行过渡方法
 */
def(VMProto, '$before', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.parentNode.insertBefore(el, target)
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $after 方法
 * 将 实例插入到 目标后, 且执行过渡方法
 */
def(VMProto, '$after', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        if (target.nextSibling) {
            target.parentNode.insertBefore(el, target.nextSibling)
        } else {
            target.parentNode.appendChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 查找目标
 */
function query (el) {
    return typeof el === 'string'
        ? document.querySelector(el)
        : el
}
/**
 * 导出ViewModel. 即 Vue
 */
module.exports = ViewModel