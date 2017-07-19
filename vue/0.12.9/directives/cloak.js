/**
 * v-cloak
 */
var config = require('../config')

module.exports = {
  bind: function () {
    var el = this.el
    // 初始化后移除.
    this.vm.$once('hook:compiled', function () {
      el.removeAttribute(config.prefix + 'cloak')
    })
  }
}
