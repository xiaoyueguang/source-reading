/**
 * v-view 子组件
 */
module.exports = {

    bind: function () {

        // track position in DOM with a ref node
        var el       = this.raw = this.el,
            parent   = el.parentNode,
            // 通过 注释 v-view 跟踪
            ref      = this.ref = document.createComment('v-view')
        parent.insertBefore(ref, el)
        parent.removeChild(el)

        // cache original content
        /* jshint boss: true */
        var node,
            frag = this.inner = document.createDocumentFragment()
        while (node = el.firstChild) {
            frag.appendChild(node)
        }

    },

    update: function(value) {

        this._unbind()
        // 
        var Ctor  = this.compiler.getOption('components', value)
        if (!Ctor) return

        var inner = this.inner.cloneNode(true)
        // 创建一个新的组件
        this.childVM = new Ctor({
            el: this.raw.cloneNode(true),
            parent: this.vm,
            created: function () {
                this.$compiler.rawContent = inner
            }
        })

        this.el = this.childVM.$el
        // 更新完成后插入 这里应该是直接更新整个组件
        if (this.compiler.init) {
            this.ref.parentNode.insertBefore(this.el, this.ref)
        } else {
            this.childVM.$before(this.ref)
        }

    },
    // 摧毁子组件
    unbind: function() {
        if (this.childVM) {
            this.childVM.$destroy()
        }
    }

}