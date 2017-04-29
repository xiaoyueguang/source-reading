/**
 * 观察者
 */
var i = 0;
function Emitter () {
    // 上下文
    this._ctx = this
    i++
    window['emitter' + i] = this
}

var EmitterProto = Emitter.prototype,
    slice = [].slice
/**
 * 监听事件
 * 将监听 event.  并且将回调传入队列
 * _cbs 是一个私有属性. 类型为对象.
 * 包含各种事件的 数组.
 */
EmitterProto.on = function(event, fn){
    this._cbs = this._cbs || {}
    ;(this._cbs[event] = this._cbs[event] || [])
        .push(fn)
    return this
}
/**
 * 监听一次事件
 * 监听 event, 执行一次后. 取消监听.
 * 通过将原先的 回调进行一次封装.
 * 执行该封装后的方法后, 取消监听并执行原先的回调函数.
 * 达到监听一次的效果.
 */
Emitter.prototype.once = function(event, fn){
    var self = this
    this._cbs = this._cbs || {}

    function on() {
        self.off(event, on)
        fn.apply(this, arguments)
    }

    on.fn = fn
    this.on(event, on)
    return this
}
/**
 * 取消监听.
 * 可取消所有的监听对象, 或取消某个事件, 或从某个事件里取消某个回调
 */
Emitter.prototype.off = function(event, fn){
    this._cbs = this._cbs || {}

    // all
    /**
     * 如果传入的值为空. 即取消全部监听. 直接给_cbs 复制一个全新的对象.
     */
    if (!arguments.length) {
        this._cbs = {}
        return this
    }

    // specific event
    // 具体事件. 如果该事件为空. 则直接返回
    var callbacks = this._cbs[event]
    if (!callbacks) return this

    // remove all handlers
    /**
     * 当传入值只有一个时, 则取消该监听的 event 所有的方法.
     * 即直接删除该监听的属性值
     */
    if (arguments.length === 1) {
        delete this._cbs[event]
        return this
    }

    // remove specific handler
    /**
     * 移除具体的事件. 循环查找
     * 若回调方法引用一致. 则通过 splice 删除该回调
     */
    var cb
    for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i]
        if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1)
            break
        }
    }
    return this
}
/**
 * 触发 触发event事件
 * 直接读取私有_cbs对象, 循环并触发该队列
 */
Emitter.prototype.emit = function(event){
    this._cbs = this._cbs || {}
    var args = slice.call(arguments, 1),
        callbacks = this._cbs[event]

    if (callbacks) {
        callbacks = callbacks.slice(0)
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i].apply(this._ctx, args)
        }
    }

    return this
}

module.exports = Emitter