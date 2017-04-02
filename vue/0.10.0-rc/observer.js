/* jshint proto:true */
/**
 * 将一个对象或数组转为一个 可观察的.
 */

var Emitter  = require('./emitter'),
    utils    = require('./utils'),
    // cache methods
    typeOf   = utils.typeOf,
    def      = utils.defProtected,
    slice    = [].slice,
    // types
    OBJECT   = 'Object',
    ARRAY    = 'Array',
    // fix for IE + __proto__ problem
    // define methods as inenumerable if __proto__ is present,
    // otherwise enumerable so we can loop through and manually
    // attach to array instances
    // 当在IE条件下时, 没有 __proto__. 则通过该方式去判断是否拥有.
    // 以便之后好做判断兼容.
    hasProto = ({}).__proto__,
    // lazy load
    ViewModel

// Array Mutation Handlers & Augmentations ------------------------------------
/**
 * 处理数组. 将数组转为可观察的数组
 */
// The proxy prototype to replace the __proto__ of
// an observed array
// 代理 数组的原型, 来代替 __proto__
var ArrayProxy = Object.create(Array.prototype)

// intercept mutation methods
/**
 * 拦截数组以下方式,
 * 使其具有观察的能力,
 * 通过以下方式去改变数组时, 都将会触发更新.
 */
;[
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
].forEach(watchMutation)

// 通过def 传入保护性的属性.
// Augment the ArrayProxy with convenience methods
// 设置值, 返回设置的值
def(ArrayProxy, '$set', function (index, data) {
    return this.splice(index, 1, data)[0]
}, !hasProto)
// 删除值, 返回被删除的值
def(ArrayProxy, '$remove', function (index) {
    if (typeof index !== 'number') {
        index = this.indexOf(index)
    }
    if (index > -1) {
        return this.splice(index, 1)[0]
    }
}, !hasProto)

/**
 *  Intercep a mutation event so we can emit the mutation info.
 *  we also analyze what elements are added/removed and link/unlink
 *  them with the parent Array.
 * 分析数组的方法, 使得数组在改变的时候能即时发出 被改变的通知.
 * 同时也将分析数组在添加或者删除时, 判断是否与 父数组连接
 */
function watchMutation (method) {
    /**
     * 传入 数组原型. 方法名, 以及 方法.
     */
    def(ArrayProxy, method, function () {

        var args = slice.call(arguments),
            result = Array.prototype[method].apply(this, args),
            inserted, removed

        // determine new / removed elements
        // 取得 插入的值或被删除的值
        if (method === 'push' || method === 'unshift') {
            inserted = args
        } else if (method === 'pop' || method === 'shift') {
            removed = [result]
        } else if (method === 'splice') {
            inserted = args.slice(2)
            removed = result
        }
        
        // link & unlink
        // 将插入的值与dom连接. 移除的值则断开连接
        linkArrayElements(this, inserted)
        unlinkArrayElements(this, removed)

        // emit the mutation event
        // 触发事件. 刷新页面
        this.__emitter__.emit('mutate', '', this, {
            method   : method,
            args     : args,
            result   : result,
            inserted : inserted,
            removed  : removed
        })

        return result
        
    }, !hasProto)
}

/**
 *  Link new elements to an Array, so when they change
 *  and emit events, the owner Array can be notified.
 * 新元素推入数组后, 将更新本身的观察者. 以便之后触发数据更新后 更新DOM
 * arr 为 数组. items 为 新插入的数组
 */
function linkArrayElements (arr, items) {
    if (items) {
        var i = items.length, item, owners
        // 循环遍历新插入的值
        while (i--) {
            item = items[i]
            // 判断是否需要观察该值
            if (isWatchable(item)) {
                // if object is not converted for observing
                // convert it...
                // 如果该值需要被观察, 而本身却没有被观察, 则将其转换, 并且观察他.
                if (!item.__emitter__) {
                    convert(item)
                    watch(item)
                }
                owners = item.__emitter__.owners
                if (owners.indexOf(arr) < 0) {
                    owners.push(arr)
                }
            }
        }
    }
}

/**
 *  Unlink removed elements from the ex-owner Array.
 * 当值被删除后, 则将 __emitter__ 里的观察对象移除
 */
function unlinkArrayElements (arr, items) {
    if (items) {
        var i = items.length, item
        while (i--) {
            item = items[i]
            if (item && item.__emitter__) {
                var owners = item.__emitter__.owners
                if (owners) owners.splice(owners.indexOf(arr))
            }
        }
    }
}

// Object add/delete key augmentation -----------------------------------------
// 对象代理...
var ObjProxy = Object.create(Object.prototype)

def(ObjProxy, '$add', function (key, val) {
    if (key in this) return
    this[key] = val
    convertKey(this, key)
    // emit a propagating set event
    this.__emitter__.emit('set', key, val, true)
}, !hasProto)

def(ObjProxy, '$delete', function (key) {
    if (!(key in this)) return
    // trigger set events
    this[key] = undefined
    delete this[key]
    this.__emitter__.emit('delete', key)
}, !hasProto)

// Watch Helpers --------------------------------------------------------------

/**
 *  Check if a value is watchable
 * 判断这个值是否需要观察
 */
function isWatchable (obj) {
    ViewModel = ViewModel || require('./viewmodel')
    var type = typeOf(obj)
    return (type === OBJECT || type === ARRAY) && !(obj instanceof ViewModel)
}

/**
 *  Convert an Object/Array to give it a change emitter.
 * 将一个对象/数组转化为一个观察者.
 * 利用def. 保证打印属性时 不会出现观察者.
 * 通过给他添加 __emitter__ 属性, 赋值 一个全新的观察者对象
 * 监听 set事件.以及 变更页面事件.
 * 并且定义了owners 以及 values
 * owners 为一个被观察的数组
 * values 为缓存的值. 通过 Object.defineProperty 来访问或修改 values对应的值
 * 返回一个 boolean.
 * true值表示已经被转化.
 * false值表示刚刚被转化
 */
function convert (obj) {
    if (obj.__emitter__) return true
    var emitter = new Emitter()
    def(obj, '__emitter__', emitter)
    emitter
        .on('set', function (key, val, propagate) {
            if (propagate) propagateChange(obj)
        })
        .on('mutate', function () {
            propagateChange(obj)
        })
    emitter.values = utils.hash()
    emitter.owners = []
    return false
}

/**
 *  Propagate an array element's change to its owner arrays
 * 当一个数组变化时, 广播数组下所有的子数组.
 */
function propagateChange (obj) {
    var owners = obj.__emitter__.owners,
        i = owners.length
    while (i--) {
        owners[i].__emitter__.emit('set', '', '', true)
    }
}

/**
 *  Watch target based on its type
 * // 观察对象. 观察分两种. Object 以及 Array
 */
function watch (obj) {
    var type = typeOf(obj)
    if (type === OBJECT) {
        watchObject(obj)
    } else if (type === ARRAY) {
        watchArray(obj)
    }
}

/**
 *  Augment target objects with modified
 *  methods
 * 将src的属性扩展到 target下. 且不可枚举
 */
function augment (target, src) {
    if (hasProto) {
        target.__proto__ = src
    } else {
        for (var key in src) {
            def(target, key, src[key])
        }
    }
}

/**
 *  Watch an Object, recursive.
 * 监视一个对象.
 */
function watchObject (obj) {
    augment(obj, ObjProxy)
    for (var key in obj) {
        convertKey(obj, key)
    }
}

/**
 *  Watch an Array, overload mutation methods
 *  and add augmentations by intercepting the prototype chain
 * 监视 数组. 将数组里的一些方法拦截住
 */
function watchArray (arr) {
    augment(arr, ArrayProxy)
    linkArrayElements(arr, arr)
}

/**
 *  Define accessors for a property on an Object
 *  so it emits get/set events.
 *  Then watch the value itself.
 * 定义对象上的 get/set 属性.
 * 保证能够在set时候能触发 页面更新
 */
function convertKey (obj, key) {
    var keyPrefix = key.charAt(0)
    // 不监听私有属性. 比如 $ _ 开头的属性值
    if (keyPrefix === '$' || keyPrefix === '_') {
        return
    }
    // emit set on bind
    // this means when an object is observed it will emit
    // a first batch of set events.
    // 获取对象下的 观察者. 通过该观察者来进行观察以及触发
    var emitter = obj.__emitter__,
        // values 是 对象监听的 值. 对对象设置的值 全部都传入该属性中
        values  = emitter.values

    init(obj[key])

    Object.defineProperty(obj, key, {
        get: function () {
            var value = values[key]
            // only emit get on tip values
            // 当 shouldGet开启时  获取对象值将触发 观察者的 监听的get 事件
            if (pub.shouldGet) {
                emitter.emit('get', key)
            }
            return value
        },
        set: function (newVal) {
            var oldVal = values[key]
            // 取消监听
            unobserve(oldVal, key, emitter)
            copyPaths(newVal, oldVal)
            // an immediate property should notify its parent
            // to emit set for itself too
            // 触发监听事件 且重新监听
            init(newVal, true)
        }
    })
    // 触发事件 重新监听
    function init (val, propagate) {
        values[key] = val
        emitter.emit('set', key, val, propagate)
        if (Array.isArray(val)) {
            emitter.emit('set', key + '.length', val.length, propagate)
        }
        observe(val, key, emitter)
    }
}

/**
 *  When a value that is already converted is
 *  observed again by another observer, we can skip
 *  the watch conversion and simply emit set event for
 *  all of its properties.
 * 当一个值已经经过监听.
 * 而其它观察者想监听该值时, 直接触发方法.
 */
function emitSet (obj) {
    var type = typeOf(obj),
        emitter = obj && obj.__emitter__
    if (type === ARRAY) {
        emitter.emit('set', 'length', obj.length)
    } else if (type === OBJECT) {
        var key, val
        for (key in obj) {
            val = obj[key]
            emitter.emit('set', key, val)
            emitSet(val)
        }
    }
}

/**
 *  Make sure all the paths in an old object exists
 *  in a new object.
 *  So when an object changes, all missing keys will
 *  emit a set event with undefined value.
 * 复制路径. 从源对象上复制路径到新对象上
 * 保证对象改变后, 不会触发额外的事件.
 */
function copyPaths (newObj, oldObj) {
    if (typeOf(oldObj) !== OBJECT || typeOf(newObj) !== OBJECT) {
        return
    }
    var path, type, oldVal, newVal
    for (path in oldObj) {
        if (!(path in newObj)) {
            oldVal = oldObj[path]
            type = typeOf(oldVal)
            if (type === OBJECT) {
                newVal = newObj[path] = {}
                copyPaths(newVal, oldVal)
            } else if (type === ARRAY) {
                newObj[path] = []
            } else {
                newObj[path] = undefined
            }
        }
    }
}

/**
 *  walk along a path and make sure it can be accessed
 *  and enumerated in that object
 * 沿着 key 的路径走. 确保对象或数组里的值都经过转变
 */
function ensurePath (obj, key) {
    var path = key.split('.'), sec
    for (var i = 0, d = path.length - 1; i < d; i++) {
        sec = path[i]
        if (!obj[sec]) {
            obj[sec] = {}
            if (obj.__emitter__) convertKey(obj, sec)
        }
        obj = obj[sec]
    }
    if (typeOf(obj) === OBJECT) {
        sec = path[i]
        if (!(sec in obj)) {
            obj[sec] = undefined
            if (obj.__emitter__) convertKey(obj, sec)
        }
    }
}

// Main API Methods -----------------------------------------------------------

/**
 *  Observe an object with a given path,
 *  and proxy get/set/mutate events to the provided observer.
 * 观察给定的路径, 给观察者代理 get set mutate事件
 * TODO:
 * 给对象或数组的每个属性监听.
 * 代理事件则绑定到父级上. 以便观察者引用触发.
 */
function observe (obj, rawPath, observer) {

    if (!isWatchable(obj)) return

    var path = rawPath ? rawPath + '.' : '',
        // 是否转化.
        alreadyConverted = convert(obj),
        emitter = obj.__emitter__

    // setup proxy listeners on the parent observer.
    // we need to keep reference to them so that they
    // can be removed when the object is un-observed.
    /**
     * 在父级上设置代理监听. 保留该引用, 以便以后被移除时取消观察
     */
    observer.proxies = observer.proxies || {}
    var proxies = observer.proxies[path] = {
        get: function (key) {
            observer.emit('get', path + key)
        },
        set: function (key, val, propagate) {
            if (key) observer.emit('set', path + key, val)
            // also notify observer that the object itself changed
            // but only do so when it's a immediate property. this
            // avoids duplicate event firing.
            if (rawPath && propagate) {
                observer.emit('set', rawPath, obj, true)
            }
        },
        mutate: function (key, val, mutation) {
            // if the Array is a root value
            // the key will be null
            var fixedPath = key ? path + key : rawPath
            observer.emit('mutate', fixedPath, val, mutation)
            // also emit set for Array's length when it mutates
            var m = mutation.method
            if (m !== 'sort' && m !== 'reverse') {
                observer.emit('set', fixedPath + '.length', val.length)
            }
        }
    }

    // attach the listeners to the child observer.
    // now all the events will propagate upwards.
    // 给事件监听 父级上的代理
    emitter
        .on('get', proxies.get)
        .on('set', proxies.set)
        .on('mutate', proxies.mutate)

    if (alreadyConverted) {
        // for objects that have already been converted,
        // emit set events for everything inside
        // 若已经监听了. 则直接触发方法
        emitSet(obj)
    } else {
        watch(obj)
    }
}

/**
 *  Cancel observation, turn off the listeners.
 * 取消监听代理上的方法
 */
function unobserve (obj, path, observer) {

    if (!obj || !obj.__emitter__) return

    path = path ? path + '.' : ''
    var proxies = observer.proxies[path]
    if (!proxies) return

    // turn off listeners
    obj.__emitter__
        .off('get', proxies.get)
        .off('set', proxies.set)
        .off('mutate', proxies.mutate)

    // remove reference
    observer.proxies[path] = null
}

// Expose API -----------------------------------------------------------------

var pub = module.exports = {

    // whether to emit get events
    // only enabled during dependency parsing
    shouldGet   : false,

    observe     : observe,
    unobserve   : unobserve,
    ensurePath  : ensurePath,
    copyPaths   : copyPaths,
    watch       : watch,
    convert     : convert,
    convertKey  : convertKey
}