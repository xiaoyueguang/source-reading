/**
 *  v-el
 */
module.exports = {
  // 文字. 区别于普通指令
  isLiteral: true,

  bind: function () {
    // 直接将当前 dom 节点放到 $$ 上
    this.vm.$$[this.expression] = this.el
  },

  unbind: function () {
    delete this.vm.$$[this.expression]
  }
}
