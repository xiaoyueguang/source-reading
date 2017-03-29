/* @flow */

import { no, noop, identity } from 'shared/util'
/**
 * 定义数值静态类型 Config
 */
export type Config = {
  // user
  optionMergeStrategies: { [key: string]: Function };
  silent: boolean;
  productionTip: boolean;
  performance: boolean;
  devtools: boolean;
  errorHandler: ?(err: Error, vm: Component, info: string) => void;
  ignoredElements: Array<string>;
  keyCodes: { [key: string]: number | Array<number> };
  // platform
  isReservedTag: (x?: string) => boolean;
  parsePlatformTagName: (x: string) => string;
  isUnknownElement: (x?: string) => boolean;
  getTagNamespace: (x?: string) => string | void;
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;
  // internal
  _assetTypes: Array<string>;
  _lifecycleHooks: Array<string>;
  _maxUpdateCount: number;
};

const config: Config = {
  /**
   * Option merge strategies (used in core/util/options)
   * 创建一个完全为空的对象
   */
  optionMergeStrategies: Object.create(null),

  /**
   * Whether to suppress warnings.
   * 禁用 警告
   */
  silent: false,

  /**
   * Show production mode tip message on boot?
   * 判断是否为 生产模式
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   * Whether to enable devtools
   * 开发模式才允许开启 开发者工具
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Whether to record perf
   * 是否记录. 
   * TODO
   */
  performance: process.env.NODE_ENV !== 'production',

  /**
   * Error handler for watcher errors
   * 观察者错误的处理程序
   */
  errorHandler: null,

  /**
   * Ignore certain custom elements
   * 忽略某些自定义元素
   */
  ignoredElements: [],

  /**
   * Custom user key aliases for v-on
   * 键盘的keyCodes 别名
   */
  keyCodes: Object.create(null),

  /**
   * Check if a tag is reserved so that it cannot be registered as a
   * component. This is platform-dependent and may be overwritten.
   * 判断一个标签是否为保留标签
   */
  isReservedTag: no,

  /**
   * Check if a tag is an unknown element.
   * Platform-dependent.
   * 判断标签是否为 未知的标签
   */
  isUnknownElement: no,

  /**
   * Get the namespace of an element
   * 获取元素的命名空间
   */
  getTagNamespace: noop,

  /**
   * Parse the real tag name for the specific platform.
   * 从特定的内容里 解析真实的标签名
   */
  parsePlatformTagName: identity,

  /**
   * Check if an attribute must be bound using property, e.g. value
   * Platform-dependent.
   * 检查是否必须使用属性
   */
  mustUseProp: no,

  /**
   * List of asset types that a component can own.
   * 资源: 组件, 指令 和过滤的哈希表
   */
  _assetTypes: [
    'component',
    'directive',
    'filter'
  ],

  /**
   * List of lifecycle hooks.
   * 生命周期钩子. 包括 keep-alive 组件的生命周期
   */
  _lifecycleHooks: [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeDestroy',
    'destroyed',
    'activated',
    'deactivated'
  ],

  /**
   * Max circular updates allowed in a scheduler flush cycle.
   * 一次更新周期内, 允许的最大循环更新
   */
  _maxUpdateCount: 100
}

export default config
