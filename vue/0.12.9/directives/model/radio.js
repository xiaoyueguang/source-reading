/**
 * radio
 */
var _ = require('../../util')

module.exports = {
  // 监听change
  bind: function () {
    var self = this
    var el = this.el
    this.listener = function () {
      self.set(el.value)
    }
    _.on(el, 'change', this.listener)
    if (el.checked) {
      this._initValue = el.value
    }
  },

  update: function (value) {
    // 通过值是否相等更新节点
    /* eslint-disable eqeqeq */
    this.el.checked = value == this.el.value
    /* eslint-enable eqeqeq */
  },

  unbind: function () {
    _.off(this.el, 'change', this.listener)
  }
}
