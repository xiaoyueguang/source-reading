/**
 * v-text 指令
 */
var _ = require('../util')

module.exports = {

  bind: function () {
    // 检查是内联还是 属性
    this.attr = this.el.nodeType === 3
      ? 'data'
      : 'textContent'
  },

  update: function (value) {
    this.el[this.attr] = _.toString(value)
  }
}
