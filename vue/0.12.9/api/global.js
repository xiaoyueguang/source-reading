/**
 * 暴露出全局方法
 */
var _ = require('../util')
var config = require('../config')

/**
 * Expose useful internals
 * 暴露一些方法.
 */

exports.util = _
exports.config = config
exports.nextTick = _.nextTick
exports.compiler = require('../compiler')

// 解析
exports.parsers = {
  path: require('../parsers/path'),
  text: require('../parsers/text'),
  template: require('../parsers/template'),
  directive: require('../parsers/directive'),
  expression: require('../parsers/expression')
}

/**
 * Each instance constructor, including Vue, has a unique
 * cid. This enables us to create wrapped "child
 * constructors" for prototypal inheritance and cache them.
 * 每个 Vue 的实例, 都将会有一个唯一的标识
 */

exports.cid = 0
var cid = 1

/**
 * Class inheritance
 * 定义扩展组件方法
 *
 * @param {Object} extendOptions
 */

exports.extend = function (extendOptions) {
  extendOptions = extendOptions || {}
  var Super = this
  var Sub = createClass(
    extendOptions.name ||
    Super.options.name ||
    'VueComponent'
  )
  Sub.prototype = Object.create(Super.prototype)
  Sub.prototype.constructor = Sub
  Sub.cid = cid++
  Sub.options = _.mergeOptions(
    Super.options,
    extendOptions
  )
  Sub['super'] = Super
  // allow further extension
  Sub.extend = Super.extend
  // create asset registers, so extended classes
  // can have their private assets too.
  // 定义资源
  config._assetTypes.forEach(function (type) {
    Sub[type] = Super[type]
  })
  return Sub
}

/**
 * A function that returns a sub-class constructor with the
 * given name. This gives us much nicer output when
 * logging instances in the console.
 * 创建一个方法. 返回一个 由 new Function 定义的方法.
 * @param {String} name
 * @return {Function}
 */

function createClass (name) {
  return new Function(
    // classify 组件名字的破折转驼峰
    'return function ' + _.classify(name) +
    ' (options) { this._init(options) }'
  )()
}

/**
 * Plugin system
 * Vue 的插件系统. 通过 USE 去调用
 * @param {Object} plugin
 */

exports.use = function (plugin) {
  // additional parameters
  var args = _.toArray(arguments, 1)
  args.unshift(this)
  // 插件默认会有个 install 方法.
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else {
    plugin.apply(null, args)
  }
  return this
}

/**
 * Create asset registration methods with the following
 * signature:
 * 将资源类型 转为 方法导出
 *
 * @param {String} id
 * @param {*} definition
 */

config._assetTypes.forEach(function (type) {
  exports[type] = function (id, definition) {
    if (!definition) {
      return this.options[type + 's'][id]
    } else {
      if (
        type === 'component' &&
        _.isPlainObject(definition)
      ) {
        definition.name = id
        definition = _.Vue.extend(definition)
      }
      this.options[type + 's'][id] = definition
    }
  }
})
