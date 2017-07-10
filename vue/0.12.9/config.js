/**
 * 配置文件.
 * 定义前缀, 调试模式, 严格模式, 安静模式, 观察者修改值, 启用{{}}标签,
 * 异步渲染, 评估模版里的表达式, 文本节点符是否改变, 组件拥有的默认属性列表,
 * 绑定模式, 一次冲刷次数限制
 * 外加一个定义 文本界定符的设置
 */
module.exports = {

  /**
   * The prefix to look for when parsing directives.
   * 前缀
   *
   * @type {String}
   */

  prefix: 'v-',

  /**
   * Whether to print debug messages.
   * Also enables stack trace for warnings.
   * 开启 debug
   *
   * @type {Boolean}
   */

  debug: false,

  /**
   * Strict mode.
   * Disables asset lookup in the view parent chain.
   * 严格模式
   */

  strict: false,

  /**
   * Whether to suppress warnings.
   * 安静模式
   *
   * @type {Boolean}
   */

  silent: false,

  /**
   * Whether allow observer to alter data objects'
   * __proto__.
   * 是否允许观察者修改 原型
   * @type {Boolean}
   */

  proto: true,

  /**
   * Whether to parse mustache tags in templates.
   * 是否在模板中解析胡子标签
   *
   * @type {Boolean}
   */

  interpolate: true,

  /**
   * Whether to use async rendering.
   * 是否启用异步更新
   */

  async: true,

  /**
   * Whether to warn against errors caught when evaluating
   * expressions.
   * 是否评估表达式中遇到的错误
   */

  warnExpressionErrors: true,

  /**
   * Internal flag to indicate the delimiters have been
   * changed.
   * 改变大胡子标签的格式
   * @type {Boolean}
   */

  _delimitersChanged: true,

  /**
   * List of asset types that a component can own.
   * 定义一个 组件所需的资源类型
   * @type {Array}
   */

  _assetTypes: [
    'component',
    'directive',
    'elementDirective',
    'filter',
    'transition',
    'partial'
  ],

  /**
   * prop binding modes
   * 指定 props 绑定模式
   */

  _propBindingModes: {
    ONE_WAY: 0,
    TWO_WAY: 1,
    ONE_TIME: 2
  },

  /**
   * Max circular updates allowed in a batcher flush cycle.
   * 重刷程序最大的更新次数(性能优化)
   */

  _maxUpdateCount: 100

}

/**
 * Interpolation delimiters.
 * We need to mark the changed flag so that the text parser
 * knows it needs to recompile the regex.
 * 设置标签类型
 * @type {Array<String>}
 */

var delimiters = ['{{', '}}']
Object.defineProperty(module.exports, 'delimiters', {
  get: function () {
    return delimiters
  },
  set: function (val) {
    delimiters = val
    this._delimitersChanged = true
  }
})
