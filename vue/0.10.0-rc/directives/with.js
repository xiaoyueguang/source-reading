/**
 * v-with. 组件传值
 */
var utils = require('../utils')

module.exports = {

    bind: function () {

        var self      = this,
            // 监听值
            childKey  = self.arg,
            // 父值
            parentKey = self.key,
            compiler  = self.compiler,
            owner     = self.binding.compiler

        if (compiler === owner) {
            // TODO: 未知.
            this.alone = true
            return
        }

        if (childKey) {
            // 检查当前编译器上是否有监听值.
            if (!compiler.bindings[childKey]) {
                compiler.createBinding(childKey)
            }
            // sync changes on child back to parent
            // 监听. 父组件值更新时, 触发子组件更新
            compiler.observer.on('change:' + childKey, function (val) {
                if (compiler.init) return
                if (!self.lock) {
                    // 锁定 更新
                    self.lock = true
                    utils.nextTick(function () {
                        self.lock = false
                    })
                }
                owner.vm.$set(parentKey, val)
            })
        }
    },

    update: function (value) {
        // sync from parent
        // 更新
        if (!this.alone && !this.lock) {
            if (this.arg) {
                this.vm.$set(this.arg, value)
            } else {
                this.vm.$data = value
            }
        }
    }

}