/**
 * v-if 是采取将 起本身元素 解析为一个实例.
 * 而后对该实例进行 显示隐藏操作.
 * 通过$before 来保证实现过渡效果
 * 由于是一个实例. 因此每次切换的时候都会对其进行实例化.
 * 导致切换的开销会变得很大...
 * 但是因为它只是在 值为 true时, 才会开始渲染. 因此有一种惰性.
 * 使得初始渲染基本为0.
 */
var utils    = require('../utils')

module.exports = {

    bind: function () {
        
        this.parent = this.el.parentNode
        // 标记
        this.ref    = document.createComment('vue-if')
        // 获得 编译器生成器
        this.Ctor   = this.compiler.resolveComponent(this.el)

        // insert ref
        // 插入标记
        this.parent.insertBefore(this.ref, this.el)
        // 移除原先模版
        this.parent.removeChild(this.el)
        // v-if 不能与 v-view 以及 v-repeat 同时存在
        // 因为都进行了组件的实例化
        if (utils.attr(this.el, 'view')) {
            utils.warn('Conflict: v-if cannot be used together with v-view')
        }
        if (utils.attr(this.el, 'repeat')) {
            utils.warn('Conflict: v-if cannot be used together with v-repeat')
        }
    },
    /**
     * {boolean} value 是否显示
     * 因为这个的
     */
    update: function (value) {
        if (!value) {
            // 摧毁解绑
            this._unbind()
        } else if (!this.childVM) {
            // 如果还没有创建子组件. 则新建一个且将实例赋值给 childVM
            this.childVM = new this.Ctor({
                el: this.el.cloneNode(true),
                parent: this.vm
            })
            if (this.compiler.init) {
                // 这里插入不会产生过渡效果
                this.parent.insertBefore(this.childVM.$el, this.ref)
            } else {
                // $before 会执行过渡方法
                this.childVM.$before(this.ref)
            }
        }
        
    },

    unbind: function () {
        // 解绑. 如果有子组件时. 执行 摧毁方法.
        // 而destroy 会自动摧毁本身以及全部的子组件.
        if (this.childVM) {
            this.childVM.$destroy()
            this.childVM = null
        }
    }
}