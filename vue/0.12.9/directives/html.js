/**
 * v-html 指令
 */
var _ = require('../util')
var templateParser = require('../parsers/template')

module.exports = {

  bind: function () {
    // a comment node means this is a binding for
    // {{{ inline unescaped html }}}
    // 内联指令
    if (this.el.nodeType === 8) {
      // hold nodes
      this.nodes = []
      // replace the placeholder with proper anchor
      this.anchor = _.createAnchor('v-html')
      _.replace(this.el, this.anchor)
    }
  },
  // 直接将 html 片段插入到 节点中
  update: function (value) {
    value = _.toString(value)
    // {{{}}}指令
    if (this.nodes) {
      this.swap(value)
    } else {
      // v-html指令.
      this.el.innerHTML = value
    }
  },

  swap: function (value) {
    // 解析
    // remove old nodes
    var i = this.nodes.length
    while (i--) {
      _.remove(this.nodes[i])
    }
    // convert new value to a fragment
    // do not attempt to retrieve from id selector
    var frag = templateParser.parse(value, true, true)
    // save a reference to these nodes so we can remove later
    this.nodes = _.toArray(frag.childNodes)
    _.before(frag, this.anchor)
  }
}
