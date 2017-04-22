/**
 * 绑定事件
 */
var utils    = require('../utils')

module.exports = {
    // 方法
    isFn: true,
    // 绑定上下文
    bind: function () {
        this.context = this.binding.isExp
            ? this.vm
            : this.binding.compiler.vm
    },

    update: function (handler) {
        // 判断是否为 方法.
        if (typeof handler !== 'function') {
            utils.warn('Directive "on" expects a function value.')
            return
        }
        // 解绑 每次更新后, 需要接触原先的绑定. 再绑定新的方法.
        // 确保只绑定一次.
        this._unbind()
        var vm = this.vm,
            context = this.context
        this.handler = function (e) {
            e.targetVM = vm
            context.$event = e
            // 执行方法.
            var res = handler.call(context, e)
            context.$event = null
            return res
        }
        // 绑定方法
        this.el.addEventListener(this.arg, this.handler)
    },

    unbind: function () {
        // 解绑
        this.el.removeEventListener(this.arg, this.handler)
    }
}