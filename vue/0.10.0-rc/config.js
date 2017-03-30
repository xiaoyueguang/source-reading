/**
 * Vue 全局配置.
 */
var TextParser = require('./text-parser')

module.exports = {
    // 前缀
    prefix         : 'v',
    // 开启调试
    debug          : false,
    // 安静模式. 取消Vue的所有日志和警告
    silent         : false,
    // 过渡方式. 进入类
    enterClass     : 'v-enter',
    // 过渡方式. 离开类
    leaveClass     : 'v-leave',
    // TODO
    interpolate    : true
}
// 文本界定符 {{}}
// 通过 Object.defineProperty 的方式来定义
// config 的 delimiters 界定符
// 设置的时候可以直接 调整 text-parser 里定义的界定符.
Object.defineProperty(module.exports, 'delimiters', {
    get: function () {
        return TextParser.delimiters
    },
    set: function (delimiters) {
        TextParser.setDelimiters(delimiters)
    }
})