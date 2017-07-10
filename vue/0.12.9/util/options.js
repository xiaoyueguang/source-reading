/**
 * 该文件是为了将父子选项 合并到 一个最终的值
 */
var _ = require('./index')
var config = require('../config')
var extend = _.extend

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 *
 * All strategy functions follow the same signature:
 *
 * @param {*} parentVal
 * @param {*} childVal
 * @param {Vue} [vm]
 */
/**
 * 空属性的对象
 * 
 */
var strats = Object.create(null)

/**
 * Helper that recursively merges two data objects together.
 * 合并对象
 */

function mergeData (to, from) {
  var key, toVal, fromVal
  for (key in from) {
    toVal = to[key]
    fromVal = from[key]
    if (!to.hasOwnProperty(key)) {
      to.$add(key, fromVal)
    } else if (_.isObject(toVal) && _.isObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}
/**
 * Data
 */
/**
 * data 数据处理
 */
strats.data = function (parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    // 子组件的 data 类型得为 function.
    if (typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && _.warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.'
      )
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        childVal.call(this),
        parentVal.call(this)
      )
    }
  } else if (parentVal || childVal) {
    return function mergedInstanceDataFn () {
      // instance merge
      var instanceData = typeof childVal === 'function'
        ? childVal.call(vm)
        : childVal
      var defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm)
        : undefined
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

/**
 * El
 */
/**
 * el 数据处理
 */
strats.el = function (parentVal, childVal, vm) {
  if (!vm && childVal && typeof childVal !== 'function') {
    process.env.NODE_ENV !== 'production' && _.warn(
      'The "el" option should be a function ' +
      'that returns a per-instance value in component ' +
      'definitions.'
    )
    return
  }
  var ret = childVal || parentVal
  // invoke the element factory if this is instance merge
  return vm && typeof ret === 'function'
    ? ret.call(vm)
    : ret
}

/**
 * Hooks and param attributes are merged as arrays.
 */
/**
 * 钩子方法以及 props. 都合并为 数组
 */
strats.created =
strats.ready =
strats.attached =
strats.detached =
strats.beforeCompile =
strats.compiled =
strats.beforeDestroy =
strats.destroyed =
strats.props = function (parentVal, childVal) {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : _.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

/**
 * 0.11 deprecation warning
 */
/**
 * 升级提醒. deprecation 属性改写为 props
 */
strats.paramAttributes = function () {
  /* istanbul ignore next */
  process.env.NODE_ENV !== 'production' && _.warn(
    '"paramAttributes" option has been deprecated in 0.12. ' +
    'Use "props" instead.'
  )
}

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 * 当合并很多的时候, 比如 实例选项 父选项 子选项. 则需要进行三项合并
 */

function mergeAssets (parentVal, childVal) {
  var res = Object.create(parentVal)
  return childVal
    ? extend(res, guardArrayAssets(childVal))
    : res
}

config._assetTypes.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Events & Watchers.
 * 事件或者监听的合并
 * Events & watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

strats.watch =
strats.events = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = {}
  extend(ret, parentVal)
  for (var key in childVal) {
    var parent = ret[key]
    var child = childVal[key]
    if (parent && !_.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : [child]
  }
  return ret
}

/**
 * Other object hashes.
 * 可计算 和方法合并
 */

strats.methods =
strats.computed = function (parentVal, childVal) {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  var ret = Object.create(parentVal)
  extend(ret, childVal)
  return ret
}

/**
 * Default strategy.
 * 默认的值
 */

var defaultStrat = function (parentVal, childVal) {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Make sure component options get converted to actual
 * constructors.
 * 确保组件选项转为 类...
 *
 * @param {Object} options
 */

function guardComponents (options) {
  if (options.components) {
    var components = options.components =
      guardArrayAssets(options.components)
    var def
    var ids = Object.keys(components)
    for (var i = 0, l = ids.length; i < l; i++) {
      var key = ids[i]
      // 判断组件名
      if (_.commonTagRE.test(key)) {
        process.env.NODE_ENV !== 'production' && _.warn(
          'Do not use built-in HTML elements as component ' +
          'id: ' + key
        )
        continue
      }
      def = components[key]
      if (_.isPlainObject(def)) {
        def.id = def.id || key
        components[key] = def._Ctor || (def._Ctor = _.Vue.extend(def))
      }
    }
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 * 确保将 props 正确格式化
 *
 * @param {Object} options
 */

function guardProps (options) {
  var props = options.props
  if (_.isPlainObject(props)) {
    options.props = Object.keys(props).map(function (key) {
      var val = props[key]
      if (!_.isPlainObject(val)) {
        val = { type: val }
      }
      val.name = key
      return val
    })
  } else if (_.isArray(props)) {
    options.props = props.map(function (prop) {
      return typeof prop === 'string'
        ? { name: prop }
        : prop
    })
  }
}

/**
 * Guard an Array-format assets option and converted it
 * into the key-value Object format.
 * 保证数组格式的选项能转为 键值对的对象格式
 * @param {Object|Array} assets
 * @return {Object}
 */

function guardArrayAssets (assets) {
  if (_.isArray(assets)) {
    var res = {}
    var i = assets.length
    var asset
    while (i--) {
      asset = assets[i]
      var id = asset.id || (asset.options && asset.options.id)
      if (!id) {
        process.env.NODE_ENV !== 'production' && _.warn(
          'Array-syntax assets must provide an id field.'
        )
      } else {
        res[id] = asset
      }
    }
    return res
  }
  return assets
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 * 合并两个选项值为一个新值
 * 
 * @param {Object} parent
 * @param {Object} child
 * @param {Vue} [vm] - if vm is present, indicates this is
 *                     an instantiation merge.
 */

exports.mergeOptions = function merge (parent, child, vm) {
  guardComponents(child)
  guardProps(child)
  var options = {}
  var key
  // mixins 合并
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = merge(parent, child.mixins[i], vm)
    }
  }
  // 从父类上键名合并
  for (key in parent) {
    mergeField(key)
  }
  // 从子类上键名合并
  for (key in child) {
    if (!(parent.hasOwnProperty(key))) {
      mergeField(key)
    }
  }
  // 合并字段
  function mergeField (key) {
    var strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 * 保证子组件能访问父类的值
 *
 * @param {Object} options
 * @param {String} type
 * @param {String} id
 * @return {Object|Function}
 */

exports.resolveAsset = function resolve (options, type, id) {
  var camelizedId = _.camelize(id)
  var asset = options[type][id] || options[type][camelizedId]
  while (
    !asset && options._parent &&
    (!config.strict || options._repeat)
  ) {
    options = options._parent.$options
    asset = options[type][id] || options[type][camelizedId]
  }
  return asset
}
