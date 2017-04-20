/**
 * html 有两种.
 * 一种是指令 v-html
 * 一种是 {{{}}}
 */
var guard = require('../utils').guard,
    slice = [].slice
module.exports = {
    // 绑定 默认放到 div 标签中
    bind: function () {
        // a comment node means this is a binding for
        // {{{ inline unescaped html }}}
        // 如果是 通过 {{{}}}去绑定的.
        // this.el 将会是一个注释.
        // <!--v-html-->. 用来做位置标记
        // 需要创建一个 holder属性.以及节点 来暂存生成的 dom
        if (this.el.nodeType === 8) {
            // hold nodes
            this.holder = document.createElement('div')
            this.nodes = []
        }
    },

    update: function (value) {
        value = guard(value)
        if (this.holder) {
            // {{{}}} 更新
            this.swap(value)
        } else {
            // v-html 更新. 直接将 dom里的 整个替换掉
            this.el.innerHTML = value
        }
    },
    // {{{}}} 更新
    swap: function (value) {
        var parent = this.el.parentNode,
            holder = this.holder,
            nodes = this.nodes,
            i = nodes.length, l
        // 将父类的移除掉节点. 因为有其它节点. 所以通过以下方式去移除
        while (i--) {
            parent.removeChild(nodes[i])
        }
        // 重新放入节点
        holder.innerHTML = value
        nodes = this.nodes = slice.call(holder.childNodes)
        for (i = 0, l = nodes.length; i < l; i++) {
            // 将元素插入到 <!--v-html--> 前.
            parent.insertBefore(nodes[i], this.el)
        }
    }
}