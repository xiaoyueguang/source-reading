/**
 * 属性指令
 */

// xlink SVG
var xlinkNS = 'http://www.w3.org/1999/xlink'
var xlinkRE = /^xlink:/

module.exports = {

  priority: 850,
  // 更新
  update: function (value) {
    if (this.arg) {
      this.setAttr(this.arg, value)
    } else if (typeof value === 'object') {
      this.objectHandler(value)
    }
  },
  // 对象的时候 设置更新对象
  objectHandler: function (value) {
    // cache object attrs so that only changed attrs
    // are actually updated.
    var cache = this.cache || (this.cache = {})
    var attr, val
    for (attr in cache) {
      if (!(attr in value)) {
        this.setAttr(attr, null)
        delete cache[attr]
      }
    }
    for (attr in value) {
      val = value[attr]
      if (val !== cache[attr]) {
        cache[attr] = val
        this.setAttr(attr, val)
      }
    }
  },
  // 设置值 基于 DOM 操作去设置
  setAttr: function (attr, value) {
    if (value != null && value !== false) {
      if (xlinkRE.test(attr)) {
        this.el.setAttributeNS(xlinkNS, attr, value)
      } else {
        this.el.setAttribute(attr, value)
      }
    } else {
      this.el.removeAttribute(attr)
    }
    if (attr === 'value' && 'value' in this.el) {
      this.el.value = value
    }
  }
}
