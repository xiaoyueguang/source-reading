/**
 * v-show 指令
 */
var transition = require('../transition')

module.exports = function (value) {
  var el = this.el
  // 执行过渡动画. 来回切换
  transition.apply(el, value ? 1 : -1, function () {
    el.style.display = value ? '' : 'none'
  }, this.vm)
}
