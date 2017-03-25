/* @flow */
/**
 * 该文件是用来 验证 props值, 以及 将 props值转为 observe 可观察的对象
 */
import { hasOwn, isObject, isPlainObject, capitalize, hyphenate } from 'shared/util'
import { observe, observerState } from '../observer/index'
import { warn } from './debug'

type PropOptions = {
  // 类型
  type: Function | Array<Function> | null,
  // 默认值
  default: any,
  // 是否必须
  required: ?boolean,
  // 验证器方法
  validator: ?Function
};
/**
 * 验证值
 */
export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key)
  /* 默认生成的值 */
  let value = propsData[key]
  // handle boolean props
  // 处理 类型为 boolean的值. 默认为 false
  if (isType(Boolean, prop.type)) {
    if (absent && !hasOwn(prop, 'default')) {
      value = false
      // 处理非类型为 string的值. 
    } else if (!isType(String, prop.type) && (value === '' || value === hyphenate(key))) {
      value = true
    }
  }
  // check default value
  /**
   * 当组件定义了 props, 但其组件的 propsData上 没有该值, 则生成一个被观察的值
   */
  if (value === undefined) {
    // 通过方法去获取组件中默认的值
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldConvert = observerState.shouldConvert
    observerState.shouldConvert = true
    observe(value)
    observerState.shouldConvert = prevShouldConvert
  }
  if (process.env.NODE_ENV !== 'production') {
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

/**
 * Get the default value of a prop.
 * 获取 vue 组件中 prop 默认的值
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  /**
   * 当def 为对象或者数组时, 报错. 这两种值必须由工厂方法执行产生
   */
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  /**
   * 如果实例上的 props值已经生成, 则返回生成的值.
   */
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  /**
   * 若.default为工厂方法, 则执行生成一个新的 对象或数组后返回
   */
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 * 断言: 判断props是否符合, 是否有效
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  // 是否必须
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }
  // 无效则需要警告. 将之前收集的全部错误 通过map 返回出来
  if (!valid) {
    warn(
      'Invalid prop: type check failed for prop "' + name + '".' +
      ' Expected ' + expectedTypes.map(capitalize).join(', ') +
      ', got ' + Object.prototype.toString.call(value).slice(8, -1) + '.',
      vm
    )
    return
  }
  const validator = prop.validator
  // 验证器验证
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

/**
 * Assert the type of a value
 * 断言: 判断该值的类型是否正确
 * @returns {object}
 *            -- valid: 是否有效
 *            -- expectedType: 类型
 */
function assertType (value: any, type: Function): {
  valid: boolean,
  expectedType: ?string
} {
  let valid
  let expectedType = getType(type)
  if (expectedType === 'String') {
    valid = typeof value === (expectedType = 'string')
  } else if (expectedType === 'Number') {
    valid = typeof value === (expectedType = 'number')
  } else if (expectedType === 'Boolean') {
    valid = typeof value === (expectedType = 'boolean')
  } else if (expectedType === 'Function') {
    valid = typeof value === (expectedType = 'function')
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 * 传入JS对象方法(即Boolean String 等), 获取类型名.
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match && match[1]
}
/**
 * 判断两者类型是否一样
 */
function isType (type, fn) {
  if (!Array.isArray(fn)) {
    return getType(fn) === getType(type)
  }
  for (let i = 0, len = fn.length; i < len; i++) {
    if (getType(fn[i]) === getType(type)) {
      return true
    }
  }
  /* istanbul ignore next */
  return false
}
