/**
 * v-partial = {{partialId}}
 * data: {
 *  partialId: 'temp'
 * },
 * partials: {
 *          // 片段中也可引用 变量
 *   temp: '<p>{{test}}</p>'
 * }
 */
var utils = require('../utils')

module.exports = {

    isLiteral: true,

    bind: function () {

        var compiler = this.compiler,
            id = this.expression
        if (!id) return
        // 读取表达式里的 变量.
        // 当表达式为 yield 的时候. 读取原先的 html 片段
        var partial = id === 'yield'
            ? this.compiler.rawContent
            // 查找对应的片段
            : this.compiler.getOption('partials', id)
        // 片段为空的时候 警告报错
        if (!partial) {
            utils.warn('Unknown partial: ' + id)
            return
        }
        // 复制一份新的片段
        partial = partial.cloneNode(true)

        // comment ref node means inline partial
        if (this.el.nodeType === 8) {

            // keep a ref for the partial's content nodes
            // 将片段插入到 dom中
            var nodes = [].slice.call(partial.childNodes),
                ref = this.el,
                parent = ref.parentNode
            parent.insertBefore(partial, ref)
            parent.removeChild(ref)
            // compile partial after appending, because its children's parentNode
            // will change from the fragment to the correct parentNode.
            // This could affect directives that need access to its element's parentNode.
            // 将node 节点编译
            nodes.forEach(compiler.compile, compiler)

        } else {

            // just set innerHTML...
            // 元素下为空的时候直接插入
            this.el.innerHTML = ''
            this.el.appendChild(partial.cloneNode(true))

        }
    }

}