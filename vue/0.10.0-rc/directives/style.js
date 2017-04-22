/**
 * 样式
 * 这个 v-style 与 以后的 :style 用法不一样.
 * v-style = 'font-size: "12px"'
 */
var camelRE = /-([a-z])/g,
    prefixes = ['webkit', 'moz', 'ms']

function camelReplacer (m) {
    return m[1].toUpperCase()
}

module.exports = {

    bind: function () {
        // prop 为 样式名称
        var prop = this.arg
        if (!prop) return
        var first = prop.charAt(0)
        if (first === '$') {
            // properties that start with $ will be auto-prefixed
            // 前面有 $标记的时. 需要自动添加前缀
            prop = prop.slice(1)
            this.prefixed = true
        } else if (first === '-') {
            // normal starting hyphens should not be converted
            prop = prop.slice(1)
        }
        // 将 带有 - 的属性名 转为 驼峰
        this.prop = prop.replace(camelRE, camelReplacer)
        
    },

    update: function (value) {
        // 更新 判断键值
        var prop = this.prop
        if (prop) {
            // 更新对应的值
            this.el.style[prop] = value
            // 添加浏览器前缀
            if (this.prefixed) {
                prop = prop.charAt(0).toUpperCase() + prop.slice(1)
                var i = prefixes.length
                while (i--) {
                    // 添加各个前缀符
                    this.el.style[prefixes[i] + prop] = value
                }
            }
        } else {
            // 直接更新 style上的值
            this.el.style.cssText = value
        }
    }

}