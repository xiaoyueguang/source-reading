/**
 * 助手方法
 */
var config    = require('./config'),
    toString  = ({}).toString,
    win       = window,
    console   = win.console,
    timeout   = win.setTimeout,
    THIS_RE   = /[^\w]this[^\w]/,
    hasClassList = 'classList' in document.documentElement,
    ViewModel // late def

var utils = module.exports = {

    /**
     *  get a value from an object keypath
     * 从对象中根据路径获取值.
     * get({a: {b: 1}}, 'a.b') // => 1
     */
    get: function (obj, key) {
        /* jshint eqeqeq: false */
        if (key.indexOf('.') < 0) {
            return obj[key]
        }
        var path = key.split('.'),
            d = -1, l = path.length
        while (++d < l && obj != null) {
            obj = obj[path[d]]
        }
        return obj
    },

    /**
     *  set a value to an object keypath
     * 根据路径, 给对象设置一个值
     * let a = {}
     * set(a, 'a.b.c', 1)
     * a => {a: {b: {c: 1}}}
     */
    set: function (obj, key, val) {
        /* jshint eqeqeq: false */
        if (key.indexOf('.') < 0) {
            obj[key] = val
            return
        }
        var path = key.split('.'),
            d = -1, l = path.length - 1
        while (++d < l) {
            if (obj[path[d]] == null) {
                obj[path[d]] = {}
            }
            obj = obj[path[d]]
        }
        obj[path[d]] = val
    },

    /**
     *  return the base segment of a keypath
     * 返回键值路径的根路径
     * baseKey('a.b.c') //=> 返回 a . 为根路径
     */
    baseKey: function (key) {
        return key.indexOf('.') > 0
            ? key.split('.')[0]
            : key
    },

    /**
     *  Create a prototype-less object
     *  which is a better hash/map
     * 创建一个空对象
     */
    hash: function () {
        return Object.create(null)
    },

    /**
     *  get an attribute and remove it.
     * 获取一个属性. 并移除该值
     * config.prefix 为前缀.
     * 这是为了获取并移除 dom 上的一些 v-on, v-text 等类似的属性.
     */
    attr: function (el, type) {
        var attr = config.prefix + '-' + type,
            val = el.getAttribute(attr)
        if (val !== null) {
            el.removeAttribute(attr)
        }
        return val
    },

    /**
     *  Define an ienumerable property
     *  This avoids it being included in JSON.stringify
     *  or for...in loops.
     * 属性保护. 给对象传入一个属性. 保证不会被 for in 枚举或者 JSON转字符串
     */
    defProtected: function (obj, key, val, enumerable, writable) {
        if (obj.hasOwnProperty(key)) return
        Object.defineProperty(obj, key, {
            value        : val,
            enumerable   : !!enumerable,
            writable     : !!writable,
            configurable : true
        })
    },

    /**
     *  Accurate type check
     *  internal use only, so no need to check for NaN
     * 获取对象类型
     */
    typeOf: function (obj) {
        return toString.call(obj).slice(8, -1)
    },

    /**
     *  Most simple bind
     *  enough for the usecase and fast than native bind()
     * 绑定上下文.
     */
    bind: function (fn, ctx) {
        return function (arg) {
            return fn.call(ctx, arg)
        }
    },

    /**
     *  Make sure null and undefined output empty string
     * 确保 null 以及 undefined 输出空字符串
     */
    guard: function (value) {
        /* jshint eqeqeq: false, eqnull: true */
        return value == null
            ? ''
            : (typeof value == 'object')
                ? JSON.stringify(value)
                : value
    },

    /**
     *  When setting value on the VM, parse possible numbers
     * vm上设置的值, 尽可能的把 number 值给取出来.
     */
    checkNumber: function (value) {
        return (isNaN(value) || value === null || typeof value === 'boolean')
            ? value
            : Number(value)
    },

    /**
     *  simple extend
     * 扩展属性
     */
    extend: function (obj, ext, protective) {
        for (var key in ext) {
            if ((protective && obj[key]) || obj[key] === ext[key]) continue
            obj[key] = ext[key]
        }
        return obj
    },

    /**
     *  filter an array with duplicates into uniques
     * 过滤数组的重复项
     * 通过给对象属性传值, 查看属性是否存在来判断是否重复
     */
    unique: function (arr) {
        var hash = utils.hash(),
            i = arr.length,
            key, res = []
        while (i--) {
            key = arr[i]
            if (hash[key]) continue
            hash[key] = 1
            res.push(key)
        }
        return res
    },

    /**
     *  Convert a string template to a dom fragment
     * 将字符串 转为 dom片段
     */
    toFragment: function (template) {
        if (typeof template !== 'string') {
            return template
        }
        if (template.charAt(0) === '#') {
            var templateNode = document.getElementById(template.slice(1))
            if (!templateNode) return
            template = templateNode.innerHTML
        }
        var node = document.createElement('div'),
            frag = document.createDocumentFragment(),
            child
        node.innerHTML = template.trim()
        /* jshint boss: true */
        while (child = node.firstChild) {
            if (node.nodeType === 1) {
                frag.appendChild(child)
            }
        }
        return frag
    },

    /**
     *  Convert the object to a ViewModel constructor
     *  if it is not already one
     * 将 对象转为 vue组件
     */
    toConstructor: function (obj) {
        ViewModel = ViewModel || require('./viewmodel')
        return utils.typeOf(obj) === 'Object'
            ? ViewModel.extend(obj)
            : typeof obj === 'function'
                ? obj
                : null
    },

    /**
     *  Check if a filter function contains references to `this`
     *  If yes, mark it as a computed filter.
     * 判断一个过滤函数 是否引用 this.
     * 如果引用了, 则将其标记 为 可自动计算的 过滤器
     */
    checkFilter: function (filter) {
        if (THIS_RE.test(filter.toString())) {
            filter.computed = true
        }
    },

    /**
     *  convert certain option values to the desired format.
     * 将值 转为需要的值
     * 1. 对象转组件
     * 2. partials 字符串转为 dom片段(TODO)
     * 3. 标记过滤器
     * 4. 模板转为 dom片段
     */
    processOptions: function (options) {
        var components = options.components,
            partials   = options.partials,
            template   = options.template,
            filters    = options.filters,
            key
        if (components) {
            for (key in components) {
                components[key] = utils.toConstructor(components[key])
            }
        }
        if (partials) {
            for (key in partials) {
                partials[key] = utils.toFragment(partials[key])
            }
        }
        if (filters) {
            for (key in filters) {
                utils.checkFilter(filters[key])
            }
        }
        if (template) {
            options.template = utils.toFragment(template)
        }
    },

    /**
     *  used to defer batch updates
     * 延迟执行. 等DOM更新完毕后, 执行方法
     */
    nextTick: function (cb) {
        timeout(cb, 0)
    },

    /**
     *  add class for IE9
     *  uses classList if available
     * 兼容IE9. 添加类
     */
    addClass: function (el, cls) {
        if (hasClassList) {
            el.classList.add(cls)
        } else {
            var cur = ' ' + el.className + ' '
            if (cur.indexOf(' ' + cls + ' ') < 0) {
                el.className = (cur + cls).trim()
            }
        }
    },

    /**
     *  remove class for IE9
     * 移除类
     */
    removeClass: function (el, cls) {
        if (hasClassList) {
            el.classList.remove(cls)
        } else {
            var cur = ' ' + el.className + ' ',
                tar = ' ' + cls + ' '
            while (cur.indexOf(tar) >= 0) {
                cur = cur.replace(tar, ' ')
            }
            el.className = cur.trim()
        }
    },

    /**
     *  Convert an object to Array
     *  used in v-repeat and array filters
     * 对象转数组.
     * 一个包含对象的数组.
     */
    objectToArray: function (obj) {
        var res = [], val, data
        for (var key in obj) {
            val = obj[key]
            data = utils.typeOf(val) === 'Object'
                ? val
                : { $value: val }
            data.$key = key
            res.push(data)
        }
        return res
    }
}

enableDebug()
/**
 * 开启调试模式
 */
function enableDebug () {
    /**
     *  log for debugging
     * 打印内容
     */
    utils.log = function (msg) {
        if (config.debug && console) {
            console.log(msg)
        }
    }
    
    /**
     *  warnings, traces by default
     *  can be suppressed by `silent` option.
     * 根据设置的 silent 来判断是否报错
     */
    utils.warn = function (msg) {
        if (!config.silent && console) {
            console.warn(msg)
            if (config.debug && console.trace) {
                console.trace(msg)
            }
        }
    }
}