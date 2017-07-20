/**
 * 过渡指令
 */
var _ = require('../util')
var Transition = require('../transition/transition')

module.exports = {

  priority: 1000,
  isLiteral: true,

  bind: function () {
    if (!this._isDynamicLiteral) {
      this.update(this.expression)
    }
  },

  update: function (id, oldId) {
    var el = this.el
    var vm = this.el.__vue__ || this.vm
    var hooks = _.resolveAsset(vm.$options, 'transitions', id)
    id = id || 'v'
    // 过渡实例
    el.__v_trans = new Transition(el, id, hooks, vm)
    if (oldId) {
      // 移除过渡
      _.removeClass(el, oldId + '-transition')
    }
    // 添加过渡
    _.addClass(el, id + '-transition')
  }
}
