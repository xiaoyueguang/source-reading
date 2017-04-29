/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 助手方法
 */
var config    = __webpack_require__(1),
    win       = window,
    toString  = ({}).toString,
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
        ViewModel = ViewModel || __webpack_require__(2)
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

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Vue 全局配置.
 */
var TextParser = __webpack_require__(7)

module.exports = {
    // 前缀
    prefix         : 'v',
    // 开启调试
    debug          : false,
    // 安静模式. 取消Vue的所有日志和警告
    silent         : false,
    // 过渡方式. 进入类
    enterClass     : 'v-enter',
    // 过渡方式. 离开类
    leaveClass     : 'v-leave',
    // TODO
    interpolate    : true
}
// 文本界定符 {{}}
// 通过 Object.defineProperty 的方式来定义
// config 的 delimiters 界定符
// 设置的时候可以直接 调整 text-parser 里定义的界定符.
Object.defineProperty(module.exports, 'delimiters', {
    get: function () {
        return TextParser.delimiters
    },
    set: function (delimiters) {
        TextParser.setDelimiters(delimiters)
    }
})

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 定义viewmodel 主要方法.
 * 编译, 并添加若干方法.
 */
var Compiler   = __webpack_require__(8),
    utils      = __webpack_require__(0),
    transition = __webpack_require__(5),
    Batcher    = __webpack_require__(3),
    slice      = [].slice,
    def        = utils.defProtected,
    nextTick   = utils.nextTick,

    // batch $watch callbacks
    watcherBatcher = new Batcher(),
    watcherId      = 1

/**
 *  ViewModel exposed to the user that holds data,
 *  computed properties, event handlers
 *  and a few reserved methods
 * ViewModel 暴露出用户传入的 data computed 定义的 methods方法
 * 以及 ViewModel的自身方法
 */
function ViewModel (options) {
    // just compile. options are passed directly to compiler
    // 编译选项
    new Compiler(this, options)
}

// All VM prototype methods are inenumerable
// so it can be stringified/looped through as raw data
var VMProto = ViewModel.prototype

/**
 *  Convenience function to get a value from
 *  a keypath
 * 定义 $get 方法.
 * 根据路径 来获取值
 */
def(VMProto, '$get', function (key, value) {
    return utils.get(this, key, value)
})

/**
 *  Convenience function to set an actual nested value
 *  from a flat key string. Used in directives.
 * 定义 $set 方法.
 * 根据路径 来设置值
 */
def(VMProto, '$set', function (key, value) {
    utils.set(this, key, value)
})

/**
 *  watch a key on the viewmodel for changes
 *  fire callback with new value
 * 定义 $watch 方法.
 * 观察值. 当值改变时 将触发 watch 队列
 */
def(VMProto, '$watch', function (key, callback) {
    // save a unique id for each watcher
    var id = watcherId++,
        self = this
    function on () {
        var args = slice.call(arguments)
        watcherBatcher.push({
            id: id,
            override: true,
            execute: function () {
                callback.apply(self, args)
            }
        })
    }
    // 在回调上添加引用. 方便取消 watch 时
    // 通过该引用取消对应的方法
    callback._fn = on
    self.$compiler.observer.on('change:' + key, on)
})

/**
 *  unwatch a key
 * 定义 $unwatch 方法.
 * 取消观察值.
 */
def(VMProto, '$unwatch', function (key, callback) {
    // workaround here
    // since the emitter module checks callback existence
    // by checking the length of arguments
    var args = ['change:' + key],
        ob = this.$compiler.observer
    if (callback) args.push(callback._fn)
    ob.off.apply(ob, args)
})

/**
 *  unbind everything, remove everything
 * 定义 $destroy 方法.
 * 生命周期. 调用摧毁方法
 */
def(VMProto, '$destroy', function () {
    this.$compiler.destroy()
})

/**
 *  broadcast an event to all child VMs recursively.
 * 定义 $broadcast 方法.
 * 从上往下, 广播事件
 * 触发 子组件的 事件. 以及继续从子组件上广播下去.
 * 从而广播到所有子组件, 以及触发对应的事件
 */
def(VMProto, '$broadcast', function () {
    var children = this.$compiler.children,
        i = children.length,
        child
    while (i--) {
        child = children[i]
        child.emitter.emit.apply(child.emitter, arguments)
        child.vm.$broadcast.apply(child.vm, arguments)
    }
})

/**
 *  emit an event that propagates all the way up to parent VMs.
 * 定义 $dispatch 方法
 * 从自身往上, 派发事件
 * 先触发自身的 事件.
 * 然后一级级往上查找 父组件, 依次触发事件.
 */
def(VMProto, '$dispatch', function () {
    var compiler = this.$compiler,
        emitter = compiler.emitter,
        parent = compiler.parent
    emitter.emit.apply(emitter, arguments)
    if (parent) {
        parent.vm.$dispatch.apply(parent.vm, arguments)
    }
})

/**
 *  delegate on/off/once to the compiler's emitter
 * 定义 $emit $on $off $once 方法.
 * 分别调用 观察者上的方法.
 */
;['emit', 'on', 'off', 'once'].forEach(function (method) {
    def(VMProto, '$' + method, function () {
        var emitter = this.$compiler.emitter
        emitter[method].apply(emitter, arguments)
    })
})

// DOM convenience methods
// DOM 方法
/**
 * 定义 $appendTo 方法
 * 将自身实例. 插入到目标里. 且执行过渡动画.
 */
def(VMProto, '$appendTo', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.appendChild(el)
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $remove 方法
 * 移除掉自身. 且执行过渡方法
 */
def(VMProto, '$remove', function (cb) {
    var el = this.$el
    transition(el, -1, function () {
        if (el.parentNode) {
            el.parentNode.removeChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $before 方法
 * 将 实例插入到 目标前. 且执行过渡方法
 */
def(VMProto, '$before', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        target.parentNode.insertBefore(el, target)
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 定义 $after 方法
 * 将 实例插入到 目标后, 且执行过渡方法
 */
def(VMProto, '$after', function (target, cb) {
    target = query(target)
    var el = this.$el
    transition(el, 1, function () {
        if (target.nextSibling) {
            target.parentNode.insertBefore(el, target.nextSibling)
        } else {
            target.parentNode.appendChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})
/**
 * 查找目标
 */
function query (el) {
    return typeof el === 'string'
        ? document.querySelector(el)
        : el
}
/**
 * 导出ViewModel. 即 Vue
 */
window.Vue = module.exports = ViewModel

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 队列.批处理执行方法.
 * 每次执行完毕后, 将会清空队列.
 */
var utils = __webpack_require__(0)
/**
 * 构造函数.
 * 清空私有队列
 */
function Batcher () {
    this.reset()
}

var BatcherProto = Batcher.prototype
/**
 * 插入任务.
 * @params job
 *          id          ID
 *          override    是否覆盖
 *          execute     执行的回调方法
 *
 * 插入任务的时候 会判断是否存在任务, 以及 任务是否在执行.
 * 存在任务且 override 为 true, 则将原任务标记为取消.
 */
BatcherProto.push = function (job) {
    if (!job.id || !this.has[job.id]) {
        this.queue.push(job)
        this.has[job.id] = job
        if (!this.waiting) {
            this.waiting = true
            // 异步执行, 防止阻塞住当前任务.
            utils.nextTick(utils.bind(this.flush, this))
        }
    } else if (job.override) {
        // 覆盖. 将原对象 标记为 清除状态. 且替换新的对象.
        var oldJob = this.has[job.id]
        oldJob.cancelled = true
        this.queue.push(job)
        this.has[job.id] = job
    }
}
/**
 * 冲洗任务
 */
BatcherProto.flush = function () {
    // before flush hook
    // 先执行 可能存在的钩子
    if (this._preFlush) this._preFlush()
    // do not cache length because more jobs might be pushed
    // as we execute existing jobs
    /**
     * 不缓存length. 因为 队列里 执行任务的时, 有可能还没执行完.
     * 队列里可能还会继续添加新的任务. 因此这里将实时获取任务长度.
     * 确保所有任务都将会被执行一遍.
     */
    for (var i = 0; i < this.queue.length; i++) {
        var job = this.queue[i]
        // 只执行 没被设置取消的 任务
        if (!job.cancelled) {
            job.execute()
        }
    }
    // 执行完毕后清空
    this.reset()
}
/**
 * 重置
 */
BatcherProto.reset = function () {
    // 缓存 id 以及对应的方法
    // 对象用来查找 ID对应的内容, 以及进行操作. 方便取消执行
    this.has = utils.hash()
    // 执行队列
    // 数组 用来执行 ID对应的方法
    this.queue = []
    // 状态
    this.waiting = false
}

module.exports = Batcher

/***/ }),
/* 4 */
/***/ (function(module, exports) {

/**
 * 观察者
 */
var i = 0;
function Emitter () {
    // 上下文
    this._ctx = this
    i++
    window['emitter' + i] = this
}

var EmitterProto = Emitter.prototype,
    slice = [].slice
/**
 * 监听事件
 * 将监听 event.  并且将回调传入队列
 * _cbs 是一个私有属性. 类型为对象.
 * 包含各种事件的 数组.
 */
EmitterProto.on = function(event, fn){
    this._cbs = this._cbs || {}
    ;(this._cbs[event] = this._cbs[event] || [])
        .push(fn)
    return this
}
/**
 * 监听一次事件
 * 监听 event, 执行一次后. 取消监听.
 * 通过将原先的 回调进行一次封装.
 * 执行该封装后的方法后, 取消监听并执行原先的回调函数.
 * 达到监听一次的效果.
 */
Emitter.prototype.once = function(event, fn){
    var self = this
    this._cbs = this._cbs || {}

    function on() {
        self.off(event, on)
        fn.apply(this, arguments)
    }

    on.fn = fn
    this.on(event, on)
    return this
}
/**
 * 取消监听.
 * 可取消所有的监听对象, 或取消某个事件, 或从某个事件里取消某个回调
 */
Emitter.prototype.off = function(event, fn){
    this._cbs = this._cbs || {}

    // all
    /**
     * 如果传入的值为空. 即取消全部监听. 直接给_cbs 复制一个全新的对象.
     */
    if (!arguments.length) {
        this._cbs = {}
        return this
    }

    // specific event
    // 具体事件. 如果该事件为空. 则直接返回
    var callbacks = this._cbs[event]
    if (!callbacks) return this

    // remove all handlers
    /**
     * 当传入值只有一个时, 则取消该监听的 event 所有的方法.
     * 即直接删除该监听的属性值
     */
    if (arguments.length === 1) {
        delete this._cbs[event]
        return this
    }

    // remove specific handler
    /**
     * 移除具体的事件. 循环查找
     * 若回调方法引用一致. 则通过 splice 删除该回调
     */
    var cb
    for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i]
        if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1)
            break
        }
    }
    return this
}
/**
 * 触发 触发event事件
 * 直接读取私有_cbs对象, 循环并触发该队列
 */
Emitter.prototype.emit = function(event){
    this._cbs = this._cbs || {}
    var args = slice.call(arguments, 1),
        callbacks = this._cbs[event]

    if (callbacks) {
        callbacks = callbacks.slice(0)
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i].apply(this._ctx, args)
        }
    }

    return this
}

module.exports = Emitter

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Vue 过渡, 是利用了 CSS3的动画.
 * 该版本的 过渡略微简陋了些.
 * 过渡分两种, CSS过渡以及 JS过渡
 * 
 * CSS过渡, 使用 v-enter v-leave.
 * 本质上是 在DOM插入到页面之前, 给其一个初始状态 v-enter.
 * 而后在插入到DOM后移除该类. 从而触发过渡.
 * 离开过渡则反过来, 先添加 离开过渡类. 然后过渡完成后移除.
 * 
 * JS过渡. 使用JS一开始定义好的 enter 以及 leave 方法
 * 过渡以及离开则直接调用该两个方法即可
 */
var endEvents  = sniffEndEvents(),
    config     = __webpack_require__(1),
    // batch enter animations so we only force the layout once
    Batcher    = __webpack_require__(3),
    batcher    = new Batcher(),
    // cache timer functions
    setTO      = window.setTimeout,
    clearTO    = window.clearTimeout,
    // exit codes for testing
    // 状态值.
    codes = {
        CSS_E     : 1,
        CSS_L     : 2,
        JS_E      : 3,
        JS_L      : 4,
        CSS_SKIP  : -1,
        JS_SKIP   : -2,
        JS_SKIP_E : -3,
        JS_SKIP_L : -4,
        INIT      : -5,
        SKIP      : -6
    }

// force layout before triggering transitions/animations
// TODO: 不知道有啥用
batcher._preFlush = function () {
    /* jshint unused: false */
    var f = document.body.offsetHeight
}

/**
 *  stage:
 *    1 = enter
 *    2 = leave
 * CSS过渡
 * 执行动画
 * @param {node} el node节点
 * @param {number} stage 状态. 1 为进入. 2 为出去
 * @param {function} cb 回调方法.
 * @param {object|compiler} compiler 编译器
 */
var transition = module.exports = function (el, stage, cb, compiler) {

    var changeState = function () {
        cb()
        // TODO:编译器的钩子
        compiler.execHook(stage > 0 ? 'attached' : 'detached')
    }

    if (compiler.init) {
        changeState()
        // 标记 初始化
        return codes.INIT
    }
    // 是否有 过渡 或者 动画属性
    var hasTransition = el.vue_trans === '',
        hasAnimation  = el.vue_anim === '',
        effectId      = el.vue_effect
        // effectId 为 JS 过渡的标记
    if (effectId) {
        return applyTransitionFunctions(
            el,
            stage,
            changeState,
            effectId,
            compiler
        )
    } else if (hasTransition || hasAnimation) {
        return applyTransitionClass(
            el,
            stage,
            changeState,
            hasAnimation
        )
    } else {
        // 当没有 effect 或 动画 过渡效果时, 直接执行
        changeState()
        return codes.SKIP
    }

}

transition.codes = codes

/**
 *  Togggle a CSS class to trigger transition
 * 执行过渡时, 仅需要切换类即可触发动画
 * @param {node} el 元素节点
 * @param {number} stage 状态 1:进入 2:离开
 * @param {function} changeState 改变状态的回调方法
 * @param {boolean} hasAnimation 是否为动画
 */
function applyTransitionClass (el, stage, changeState, hasAnimation) {
    // 浏览器不支持动画时, 标记为 因css而跳过
    if (!endEvents.trans) {
        changeState()
        return codes.CSS_SKIP
    }

    // if the browser supports transition,
    // it must have classList...
    // 设置类的列表. 以及进入出去的类名.
    var onEnd,
        classList        = el.classList,
        // 结束后的回调
        existingCallback = el.vue_trans_cb,
        enterClass       = config.enterClass,
        leaveClass       = config.leaveClass,
        endEvent         = hasAnimation ? endEvents.anim : endEvents.trans

    // cancel unfinished callbacks and jobs
    // 动画或者过渡被中止.
    if (existingCallback) {
        el.removeEventListener(endEvent, existingCallback)
        classList.remove(enterClass)
        classList.remove(leaveClass)
        el.vue_trans_cb = null
    }

    if (stage > 0) { // enter

        // set to enter state before appending
        // 在 append 之前, 先添加初始 类名
        classList.add(enterClass)
        // append
        changeState()
        // trigger transition
        // 批处理类过渡.
        if (!hasAnimation) {
            batcher.push({
                execute: function () {
                    classList.remove(enterClass)
                }
            })
        } else {
            onEnd = function (e) {
                if (e.target === el) {
                    // 保证过渡完成后即时移除
                    el.removeEventListener(endEvent, onEnd)
                    el.vue_trans_cb = null
                    classList.remove(enterClass)
                }
            }
            el.addEventListener(endEvent, onEnd)
            el.vue_trans_cb = onEnd
        }
        // 标记 过渡进入完成
        return codes.CSS_E

    } else { // leave
        // 判断当前 元素是否 具有长宽
        if (el.offsetWidth || el.offsetHeight) {
            // trigger hide transition
            // 添加离开过渡类
            classList.add(leaveClass)
            onEnd = function (e) {
                if (e.target === el) {
                    // 保证过渡完成后即时移除
                    el.removeEventListener(endEvent, onEnd)
                    el.vue_trans_cb = null
                    // actually remove node here
                    changeState()
                    classList.remove(leaveClass)
                }
            }
            // attach transition end listener
            el.addEventListener(endEvent, onEnd)
            el.vue_trans_cb = onEnd
        } else {
            // directly remove invisible elements
            // 如果该元素并不具有长宽. 直接触发结果
            changeState()
        }
        // 标记 过渡离开完成
        return codes.CSS_L

    }

}
/**
 * JS过渡
 * @param {node} el node节点
 * @param {number} stage 状态. 1 为进入. 2 为出去
 * @param {function} changeState 改变dom状态
 * @param {*} effectId 
 * @param {object|compiler} compiler 编译器
 */
function applyTransitionFunctions (el, stage, changeState, effectId, compiler) {

    var funcs = compiler.getOption('effects', effectId)
    if (!funcs) {
        changeState()
        // 标记为 JS跳过
        return codes.JS_SKIP
    }
    // 分别取出 进入 离开 方法.
    var enter = funcs.enter,
        leave = funcs.leave,
        timeouts = el.vue_timeouts

    // clear previous timeouts
    // 取消之前的 setTimeout
    if (timeouts) {
        var i = timeouts.length
        while (i--) {
            // 取消
            clearTO(timeouts[i])
        }
    }

    timeouts = el.vue_timeouts = []
    function timeout (cb, delay) {
        var id = setTO(function () {
            cb()
            // 完成一个timeout则移除
            timeouts.splice(timeouts.indexOf(id), 1)
            if (!timeouts.length) {
                el.vue_timeouts = null
            }
        }, delay)
        timeouts.push(id)
    }

    if (stage > 0) { // enter
        if (typeof enter !== 'function') {
            changeState()
            // 标记为 js 跳过进入
            return codes.JS_SKIP_E
        }
        enter(el, changeState, timeout)
        // 标记为 js 进入
        return codes.JS_E
    } else { // leave
        if (typeof leave !== 'function') {
            changeState()
            // 标记为 js 跳过离开
            return codes.JS_SKIP_L
        }
        leave(el, changeState, timeout)
        // 标记为 js 离开
        return codes.JS_L
    }

}

/**
 *  Sniff proper transition end event name
 * 嗅探过渡结束事件.
 * 创建一个dom元素. 检查 transition, mozTransition, webkitTransition
 * 来确定过渡结束事件.
 * 以及 嗅探 animationend事件
 */
function sniffEndEvents () {
    var el = document.createElement('vue'),
        defaultEvent = 'transitionend',
        events = {
            'transition'       : defaultEvent,
            'mozTransition'    : defaultEvent,
            'webkitTransition' : 'webkitTransitionEnd'
        },
        ret = {}
    for (var name in events) {
        if (el.style[name] !== undefined) {
            ret.trans = events[name]
            break
        }
    }
    ret.anim = el.style.animation === ''
        ? 'animationend'
        : 'webkitAnimationEnd'
    return ret
}

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

/* jshint proto:true */
/**
 * 将一个对象或数组转为一个 可观察的.
 */

var Emitter  = __webpack_require__(4),
    utils    = __webpack_require__(0),
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
    ViewModel = ViewModel || __webpack_require__(2)
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
                // 触发 get事件. 收集依赖.
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
    if (observer.proxies) {window.ob = observer}

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

/***/ }),
/* 7 */
/***/ (function(module, exports) {

/**
 * 解析 dom属性里 或 dom文本里的字符
 */
var openChar  = '{',
    endChar   = '}',
    ESCAPE_RE  = /[-.*+?^${}()|[\]\/\\]/g,
    BINDING_RE = buildInterpolationRegex()
/**
 * 构建正则. 匹配 {{}} {{{}}}
 */
function buildInterpolationRegex () {
    var open = escapeRegex(openChar),
        end  = escapeRegex(endChar)
    return new RegExp(open + open + open + '?(.+?)' + end + '?' + end + end)
}
/**
 * 
 */
function escapeRegex (str) {
    return str.replace(ESCAPE_RE, '\\$&')
}
/**
 * 设置界定符.
 * @param {*} delimiters 
 */
function setDelimiters (delimiters) {
    exports.delimiters = delimiters
    openChar = delimiters[0]
    endChar = delimiters[1]
    BINDING_RE = buildInterpolationRegex()
}

/** 
 *  Parse a piece of text, return an array of tokens
 *  token types:
 *  1. plain string
 *  2. object with key = binding key
 *  3. object with key & html = true
 * 解析字符串. 返回 包含令牌的数组
 * 令牌类型有
 *   纯字符串
 *   对象 界定符里的字符串传入到 key 里
 *   对象 {{{}}} 如果是这种, 则 对象里的html 为true
 *
 * 例子: parse('{{msg}} msg: {{{msg}}}')
 * [{"key":"msg","html":false}," msg: ",{"key":"msg","html":true}]
 */
function parse (text) {
    if (!BINDING_RE.test(text)) return null
    var m, i, token, match, tokens = []
    /* jshint boss: true */
    while (m = text.match(BINDING_RE)) {
        i = m.index
        if (i > 0) tokens.push(text.slice(0, i))
        token = { key: m[1].trim() }
        match = m[0]
        token.html =
            match.charAt(2) === openChar &&
            match.charAt(match.length - 3) === endChar
        tokens.push(token)
        text = text.slice(i + m[0].length)
    }
    if (text.length) tokens.push(text)
    return tokens
}

/**
 *  Parse an attribute value with possible interpolation tags
 *  return a Directive-friendly expression
 *
 *  e.g.  a {{b}} c  =>  "a " + b + " c"
 * 从 dom 的属性里 解析. 返回一个对 指令友好的 表达式
 * v-class = 'a {{b}} c' => "a " + b + " c"
 */
function parseAttr (attr) {
    var tokens = parse(attr)
    if (!tokens) return null
    if (tokens.length === 1) return tokens[0].key
    var res = [], token
    for (var i = 0, l = tokens.length; i < l; i++) {
        token = tokens[i]
        res.push(
            token.key
                ? ('(' + token.key + ')')
                : ('"' + token + '"')
        )
    }
    return res.join('+')
}

exports.parse         = parse
exports.parseAttr     = parseAttr
exports.setDelimiters = setDelimiters
exports.delimiters    = [openChar, endChar]

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 编译器
 * 定义 Compiler 编译器.
 * 定义了 编译, 摧毁, 子组件生成等一系列方法
 */
var Emitter     = __webpack_require__(4),
    Observer    = __webpack_require__(6),
    config      = __webpack_require__(1),
    utils       = __webpack_require__(0),
    Binding     = __webpack_require__(9),
    Directive   = __webpack_require__(11),
    TextParser  = __webpack_require__(7),
    DepsParser  = __webpack_require__(10),
    ExpParser   = __webpack_require__(22),
    ViewModel,
    
    // cache methods
    // 缓存方法
    slice       = [].slice,
    each        = [].forEach,
    makeHash    = utils.hash,
    extend      = utils.extend,
    def         = utils.defProtected,
    hasOwn      = ({}).hasOwnProperty,

    // hooks to register
    // 生命周期
    hooks = [
        'created', 'ready',
        'beforeDestroy', 'afterDestroy',
        'attached', 'detached'
    ],

    // list of priority directives
    // that needs to be checked in specific order
    // 优先指令.
    // 当一个dom上存在多个指令时, 会优先从以下列表中读取. 以节省性能
    priorityDirectives = [
        // TODO:if 为什么分开?
        'i' + 'f',
        'repeat',
        'view',
        'component'
    ]

/**
 *  The DOM compiler
 *  scans a DOM node and compile bindings for a ViewModel
 * DOM编译器. 扫描DOM节点, 将指令绑定到一个 Vue 实例上
 * 定义了三种状态, init, repeat, 以及 destroyed.
 * 扩展属性后, 处理对应的属性.
 * 将传入的data值和methods方法放到实例下. 方便实例中直接查询值和使用方法.
 * 组件还会有自己的自定义属性.
 * ======================
 * 开始处理dom. 利用 setupElement方法, 将节点中的 DOM节点移动到JS中.
 * 并复制到原节点中. 来完成dom挂载.
 * 定义自身实例, 捆绑类, 指令集. 指令, 可计算, 子编译器集合, 观察者, 上下文 以及代理.
 * 定义 $:组件集合, $el: 自身元素, $options: 选项, $compiler: 本身编译器, $event: 事件
 * 定义根编译器以及父编译器.
 * ======================
 * 在 编译器上新增一个全新的观察者observer.
 * 利用 依赖收集, 分别将 值的 get, set, mutate 的依赖收集起来.
 * 监听 生命周期钩子.
 * ======================
 * 收集 计算属性, 同时为计算属性创建绑定.
 * 收集属性上的表达式. 存放到实例上.
 * ======================
 * 触发声明钩子: created
 * 将 data上的值转换, 转为可观察的. 当值改变的时候,
 * 通知 compiler.observer. 来更新值
 * 如果是 循环, 还将要创建 $index 和 $key值
 * 递归编译生成的DOM节点, 将节点上的指令提取出来.
 * 当前组件编译完成后 则开始子组件的编译提取指令
 * 可计算的属性已经完成, 则开始收集他们的依赖.
 * 触发声明钩子: ready
 */
function Compiler (vm, options) {

    var compiler = this

    // default state
    // 编译器的状态. 初始化, 重复, 摧毁
    compiler.init       = true
    compiler.repeat     = false
    compiler.destroyed  = false

    // process and extend options
    // 处理扩展属性
    options = compiler.options = options || makeHash()
    // 处理 组件, dom片段, 过滤器, 模版
    utils.processOptions(options)

    // copy data, methods & compiler options
    // 扩展属性. 将data, 方法 扩展到 实例下
    // 使得实例可通过this访问数据或方法
    var data = compiler.data = options.data || {}
    extend(vm, data, true)
    extend(vm, options.methods, true)
    // 组件上的 选项.
    extend(compiler, options.compilerOptions)

    // initialize element
    // 初始化元素
    var el = compiler.el = compiler.setupElement(options)
    // 打印挂载的元素标签名
    utils.log('\nnew VM instance: ' + el.tagName + '\n')

    // set compiler properties
    // 设置编译器的默认值
    // 当前本身实例
    compiler.vm = el.vue_vm = vm
    // 捆绑类. 
    compiler.bindings = makeHash()
    // 指令
    compiler.dirs = []
    // 指令集
    compiler.deferred = []
    // 计算属性.
    // 不仅包含 computed属性里的方法
    // 模版里的表达式如果有对某个属性引用, 也会被封装成一个作为计算属性的匿名方法
    compiler.computed = []
    // 子组件 子编译器
    compiler.children = []
    // 观察者
    compiler.emitter = new Emitter()
    // 观察者的上下文
    compiler.emitter._ctx = vm
    // 代理
    compiler.delegators = makeHash()

    // set inenumerable VM properties
    // 设置一些保护属性.
    def(vm, '$', makeHash())
    def(vm, '$el', el)
    def(vm, '$options', options)
    def(vm, '$compiler', compiler)
    // 不可枚举. 可重写
    def(vm, '$event', null, false, true)

    // set parent
    var parentVM = options.parent
    if (parentVM) {
        compiler.parent = parentVM.$compiler
        parentVM.$compiler.children.push(compiler)
        def(vm, '$parent', parentVM)
    }
    // set root
    // 设置 根编译器
    def(vm, '$root', getRoot(compiler).vm)

    // setup observer
    // 执行 安装观察者
    compiler.setupObserver()

    // create bindings for computed properties
    // 计算属性绑定
    var computed = options.computed
    if (computed) {
        for (var key in computed) {
            compiler.createBinding(key)
        }
    }

    // copy paramAttributes
    // 复制属性
    if (options.paramAttributes) {
        options.paramAttributes.forEach(function (attr) {
            var val = compiler.eval(el.getAttribute(attr))
            vm[attr] = utils.checkNumber(val)
        })
    }

    // beforeCompile hook
    // 触发钩子
    compiler.execHook('created')

    // the user might have set some props on the vm 
    // so copy it back to the data...
    // 将vm上设置的一些属性 props 复制到data上
    extend(data, vm)
    // observe the data
    // 转换data
    compiler.observeData(data)
    
    // for repeated items, create index/key bindings
    // because they are ienumerable
    // 启用了 v-repeat的, 则将绑定 $index 以及$key
    if (compiler.repeat) {
        compiler.createBinding('$index')
        if (data.$key) {
            compiler.createBinding('$key')
        }
    }

    // now parse the DOM, during which we will create necessary bindings
    // and bind the parsed directives
    // 编译生成DOM节点. 并生成指令
    compiler.compile(el, true)

    // bind deferred directives (child components)
    // 子组件需要延迟绑定生成指令
    compiler.deferred.forEach(function (dir) {
        compiler.bindDirective(dir)
    })

    // extract dependencies for computed properties
    // 收集计算属性依赖
    compiler.parseDeps()

    // done!
    // 原始内容清空. 初始化完成
    compiler.rawContent = null
    compiler.init = false

    // post compile / ready hook
    // 完成后 触发 ready声明钩子
    compiler.execHook('ready')
}

var CompilerProto = Compiler.prototype

/**
 *  Initialize the VM/Compiler's element.
 *  Fill it in with the template if necessary.
 * 初始化 VM/compiler元素.
 * 返回一个经过模版以及属性处理后的模版
 */
CompilerProto.setupElement = function (options) {
    // create the node first
    // 读取 挂在的DOM节点. 没有则直接创建一个
    var el = typeof options.el === 'string'
        ? document.querySelector(options.el)
        : options.el || document.createElement(options.tagName || 'div')

    var template = options.template
    if (template) {
        // collect anything already in there
        /* jshint boss: true */
        var child,
            // frag 原始内容. 
            frag = this.rawContent = document.createDocumentFragment()
        // 将原本的 模版全部都移动到 frag 下
        while (child = el.firstChild) {
            frag.appendChild(child)
        }
        // replace option: use the first node in
        // the template directly
        /**
         * replace 存在时, 则将模版的第一个子元素复制插入到 el前, 移除el
         * 来达到替换el
         */
        if (options.replace && template.childNodes.length === 1) {
            var replacer = template.childNodes[0].cloneNode(true)
            if (el.parentNode) {
                el.parentNode.insertBefore(replacer, el)
                el.parentNode.removeChild(el)
            }
            // copy over attributes
            // 将原先 el 上的属性复制到新的模版上
            each.call(el.attributes, function (attr) {
                replacer.setAttribute(attr.name, attr.value)
            })
            // replace
            // 替换el指向. 取消原先dom的引用
            el = replacer
        } else {
            // 将模版里 DOM深复制一份 添加到el下
            el.appendChild(template.cloneNode(true))
        }
    }

    // apply element options
    // 处理元素的属性: id, className, 以及其它 attrs属性.
    if (options.id) el.id = options.id
    if (options.className) el.className = options.className
    var attrs = options.attributes
    if (attrs) {
        for (var attr in attrs) {
            el.setAttribute(attr, attrs[attr])
        }
    }

    return el
}

/**
 *  Setup observer.
 *  The observer listens for get/set/mutate events on all VM
 *  values/objects and trigger corresponding binding updates.
 *  It also listens for lifecycle hooks.
 * 设置编译器上的观察者
 * 还会监听 生命周期
 */
CompilerProto.setupObserver = function () {

    var compiler = this,
        bindings = compiler.bindings,
        options  = compiler.options,
        // 添加观察者
        observer = compiler.observer = new Emitter()

    // a hash to hold event proxies for each root level key
    // so they can be referenced and removed later
    // 设置 代理. 以及 上下文.
    // 代理 追溯到 根节点 TODO:
    observer.proxies = makeHash()
    observer._ctx = compiler.vm

    // add own listeners which trigger binding updates
    // 设置 三个监听
    observer
        .on('get', onGet)
        .on('set', onSet)
        .on('mutate', onSet)

    // register hooks
    // 注册钩子.
    hooks.forEach(function (hook) {
        var fns = options[hook]
        if (Array.isArray(fns)) {
            var i = fns.length
            // since hooks were merged with child at head,
            // we loop reversely.
            // 钩子方法,居然可以为一个数组... 真是意外.
            while (i--) {
                registerHook(hook, fns[i])
            }
        } else if (fns) {
            registerHook(hook, fns)
        }
    })

    // broadcast attached/detached hooks
    // 监听 attached, detached. 触发后直接广播对应的事件到所有子组件
    observer
        .on('hook:attached', function () {
            broadcast(1)
        })
        .on('hook:detached', function () {
            broadcast(0)
        })
    // 收集依赖.
    function onGet (key) {
        check(key)
        // 触发后 可收集依赖.触发 deps-parset 里的方法.
        DepsParser.catcher.emit('get', bindings[key])
    }
    // 更新
    function onSet (key, val, mutation) {
        // 改变的时候触发 change.
        observer.emit('change:' + key, val, mutation)
        check(key)
        // 更新对应的值.
        bindings[key].update(val)
    }
    // 注册钩子. 监听钩子方法
    function registerHook (hook, fn) {
        observer.on('hook:' + hook, function () {
            fn.call(compiler.vm)
        })
    }
    // 广播 这个广播 只钩子 attached, detached
    function broadcast (event) {
        var children = compiler.children
        if (children) {
            var child, i = children.length
            while (i--) {
                child = children[i]
                if (child.el.parentNode) {
                    event = 'hook:' + (event ? 'attached' : 'detached')
                    child.observer.emit(event)
                    child.emitter.emit(event)
                }
            }
        }
    }
    // 检查 key 值是否存在. 不存在则直接创建
    function check (key) {
        if (!bindings[key]) {
            compiler.createBinding(key)
        }
    }
}
// 监听数据
CompilerProto.observeData = function (data) {

    var compiler = this,
        observer = compiler.observer

    // recursively observe nested properties
    // 递归观察转换 数据
    Observer.observe(data, '', observer)

    // also create binding for top level $data
    // so it can be used in templates too
    // 绑定添加$data属性, 为$data添加绑定
    var $dataBinding = compiler.bindings['$data'] = new Binding(compiler, '$data')
    $dataBinding.update(data)

    // allow $data to be swapped
    // 将$data 添加到 vm下
    defGetSet(compiler.vm, '$data', {
        enumerable: false,
        get: function () {
            compiler.observer.emit('get', '$data')
            return compiler.data
        },
        set: function (newData) {
            var oldData = compiler.data
            Observer.unobserve(oldData, '', observer)
            compiler.data = newData
            Observer.copyPaths(newData, oldData)
            Observer.observe(newData, '', observer)
            update()
        }
    })

    // emit $data change on all changes
    // 监听观察 $data
    observer
        .on('set', onSet)
        .on('mutate', onSet)

    function onSet (key) {
        if (key !== '$data') update()
    }

    function update () {
        $dataBinding.update(compiler.data)
        observer.emit('change:$data', compiler.data)
    }
}

/**
 *  Compile a DOM node (recursive)
 * 编译生成DOM节点. 递归.
 */
CompilerProto.compile = function (node, root) {
    var nodeType = node.nodeType
    // dom元素 与 text节点处理方式不一致
    if (nodeType === 1 && node.tagName !== 'SCRIPT') { // a normal node
        this.compileElement(node, root)
    } else if (nodeType === 3 && config.interpolate) {
        this.compileTextNode(node)
    }
}

/**
 *  Check for a priority directive
 *  If it is present and valid, return true to skip the rest
 * 检查DOM节点上的指令
 * {string} dirname 指令名称
 * {Element} node 节点
 * {Boolean} root 是否为根节点
 */
CompilerProto.checkPriorityDir = function (dirname, node, root) {
    var expression, directive, Ctor
    // 非root 即非根组件
    if (dirname === 'component' && root !== true && (Ctor = this.resolveComponent(node, undefined, true))) {
        // 解析组件
        directive = Directive.parse(dirname, '', this, node)
        directive.Ctor = Ctor
    } else {
        // 获取表达式
        expression = utils.attr(node, dirname)
        // 对表达式解析
        directive = expression && Directive.parse(dirname, expression, this, node)
    }
    if (directive) {
        if (root === true) {
            // 优先指令, 不能绑定到根节点上
            utils.warn('Directive v-' + dirname + ' cannot be used on manually instantiated root node.')
            return
        }
        // 将指令推送到 deferred 数组里, 延迟执行
        this.deferred.push(directive)
        return true
    }
}

/**
 *  Compile normal directives on a node
 * 将节点上的指令提取出来
 */
CompilerProto.compileElement = function (node, root) {

    // textarea is pretty annoying
    // because its value creates childNodes which
    // we don't want to compile.
    // textarea 区别对待.
    if (node.tagName === 'TEXTAREA' && node.value) {
        node.value = this.eval(node.value)
    }

    // only compile if this element has attributes
    // or its tagName contains a hyphen (which means it could
    // potentially be a custom element)
    // 判断 该DOM节点是否为 组件
    if (node.hasAttributes() || node.tagName.indexOf('-') > -1) {

        // skip anything with v-pre
        // 当节点上有 v-pre指令时, 跳过编译
        if (utils.attr(node, 'pre') !== null) {
            return
        }

        // check priority directives.
        // if any of them are present, it will take over the node with a childVM
        // so we can skip the rest
        // 先处理优先指令.
        for (var i = 0, l = priorityDirectives.length; i < l; i++) {
            // 检查是否为优先指令. 如果是的话. 则停止解析
            if (this.checkPriorityDir(priorityDirectives[i], node, root)) {
                return
            }
        }

        // check transition & animation properties
        // 检查动画或过渡属性
        node.vue_trans  = utils.attr(node, 'transition')
        node.vue_anim   = utils.attr(node, 'animation')
        node.vue_effect = this.eval(utils.attr(node, 'effect'))        //  前缀
        var prefix = config.prefix + '-',
            // 将 节点上的属性转为数组方式
            attrs = slice.call(node.attributes),
            // 读取传入的 参数属性
            params = this.options.paramAttributes,
            attr, isDirective, exps, exp, directive, dirname

        i = attrs.length
        while (i--) {
            attr = attrs[i]

            isDirective = false
            // 判断是否为指令
            if (attr.name.indexOf(prefix) === 0) {
                // a directive - split, parse and bind it.
                isDirective = true
                // 将表达式切割
                exps = Directive.split(attr.value)
                // loop through clauses (separated by ",")
                // inside each attribute
                l = exps.length
                // 循环表达式 绑定
                while (l--) {
                    exp = exps[l]
                    dirname = attr.name.slice(prefix.length)
                    directive = Directive.parse(dirname, exp, this, node)
                    if (dirname === 'with') {
                        // with 指令 继承父类数据
                        this.bindDirective(directive, this.parent)
                    } else {
                        this.bindDirective(directive)
                    }
                    
                }
            } else if (config.interpolate) {
                // non directive attribute, check interpolation tags
                // 非指令属性.
                // 将文本值 转为表达式
                exp = TextParser.parseAttr(attr.value)
                if (exp) {
                    directive = Directive.parse('attr', attr.name + ':' + exp, this, node)
                    if (params && params.indexOf(attr.name) > -1) {
                        // a param attribute... we should use the parent binding
                        // to avoid circular updates like size={{size}}
                        // 属性较多的时候 通过父 绑定. 避免更新多次
                        this.bindDirective(directive, this.parent)
                    } else {
                        this.bindDirective(directive)
                    }
                }
            }
            // 移除 dom上的 指令. v-cloak则在整个vm解析完成之后再移除
            if (isDirective && dirname !== 'cloak') {
                node.removeAttribute(attr.name)
            }
        }

    }

    // recursively compile childNodes
    // 如果有子节点的话. 递归编译
    if (node.hasChildNodes()) {
        slice.call(node.childNodes).forEach(this.compile, this)
    }
}

/**
 *  Compile a text node
 * 解析文字节点
 */
CompilerProto.compileTextNode = function (node) {
    // 文字节点解析. 获得一个令牌. 令牌类型看该方法注释
    var tokens = TextParser.parse(node.nodeValue)
    if (!tokens) return
    var el, token, directive
    for (var i = 0, l = tokens.length; i < l; i++) {

        token = tokens[i]
        directive = null

        // 检查该令牌绑定的键值
        if (token.key) { // a binding
            if (token.key.charAt(0) === '>') { // a partial
                el = document.createComment('ref')
                directive = Directive.parse('partial', token.key.slice(1), this, el)
            } else {
                // 文字绑定
                if (!token.html) { // text binding
                    // 创建一个文字节点
                    el = document.createTextNode('')
                    directive = Directive.parse('text', token.key, this, el)
            } else { // html binding
                // html绑定. 指令调用html内容
                    el = document.createComment(config.prefix + '-html')
                    window.a = el
                    directive = Directive.parse('html', token.key, this, el)
                }
            }
        } else { // a plain string
            // 纯字符 直接创建文字节点. 不绑定.
            el = document.createTextNode(token)
        }

        // insert node
        // 插入被绑定了指令的 节点
        node.parentNode.insertBefore(el, node)
        // bind directive
        // 将指令绑定到 绑定类和vm中
        this.bindDirective(directive)

    }
    // 移除原先的, 未绑定的节点
    node.parentNode.removeChild(node)
}

/**
 *  Add a directive instance to the correct binding & viewmodel
 * 将指令绑定到 绑定类和vm中. 即如何处理生成的指令.
 * {Directive} directive 指令
 * {Binding} bindingOwner 绑定类
 */
CompilerProto.bindDirective = function (directive, bindingOwner) {

    if (!directive) return

    // keep track of it so we can unbind() later
    // 将指令传入 指令集
    this.dirs.push(directive)
    // for empty or literal directives, simply call its bind()
    // and we're done.
    // 这里涉及到指令的特殊处理. 是否为空或 为文字 则只进行绑定操作
    if (directive.isEmpty || directive.isLiteral) {
        if (directive.bind) directive.bind()
        return
    }

    // otherwise, we got more work to do...
    var binding,
        compiler = bindingOwner || this,
        key      = directive.key
    // 指令是否为表达式
    if (directive.isExp) {
        // expression bindings are always created on current compiler
        // 如果指令里为表达式的话, 则在当前的编译器里绑定表达式
        binding = compiler.createBinding(key, directive)
    } else {
        // recursively locate which compiler owns the binding
        // 从当前编译器上往上查找. 找到拥有该 绑定类的 编译器
        while (compiler) {
            if (compiler.hasKey(key)) {
                break
            } else {
                compiler = compiler.parent
            }
        }
        compiler = compiler || this
        // 取出从某个编译器上找到的 指令绑定..
        binding = compiler.bindings[key] || compiler.createBinding(key)
    }
    // 将指令传入该指令集中
    binding.dirs.push(directive)
    // 更新指令的绑定
    directive.binding = binding
    // 从指令上获取一个新的值.
    var value = binding.val()
    // invoke bind hook if exists
    // 如果指令上有 bind, 则添加绑定这个值
    if (directive.bind) {
        directive.bind(value)
    }
    // set initial value
    // 设置值
    directive.update(value, true)
}

/**
 *  Create binding and attach getter/setter for a key to the viewmodel object
 * 为 vm 创建绑定一个 getter/setter. 即 绑定表达式
 * {string} key 属性名
 * {Directive} directive 指令
 */
CompilerProto.createBinding = function (key, directive) {

    utils.log('  created binding: ' + key)

    var compiler = this,
        // 是否表达式
        isExp    = directive && directive.isExp,
        // 是否方法
        isFn     = directive && directive.isFn,
        // 捆绑集合
        bindings = compiler.bindings,
        // 计算属性
        computed = compiler.options.computed,
        // 捆绑
        binding  = new Binding(compiler, key, isExp, isFn)

    // 这里会根据 不同的 binding 捆绑类来进行不一样的处理
    if (isExp) {
        // expression bindings are anonymous
        // 如果指令为表达式. 则将指令封装成一个匿名方法.
        compiler.defineExp(key, binding, directive)
    } else {
        bindings[key] = binding
        if (binding.root) {
            // this is a root level binding. we need to define getter/setters for it.
            // 根级绑定. 为其设置 getter/setter
            if (computed && computed[key]) {
                // 处理计算属性
                // computed property
                compiler.defineComputed(key, binding, computed[key])
            } else if (key.charAt(0) !== '$') {
                // normal property
                // 普通属性. 非私有属性. 转换值
                compiler.defineProp(key, binding)
            } else {
                // 私有属性. 以 $为开头的属性
                compiler.defineMeta(key, binding)
            }
        } else if (computed && computed[utils.baseKey(key)]) {
            // nested path on computed property
            // 计算属性的嵌套数据
            compiler.defineExp(key, binding)
        } else {
            // ensure path in data so that computed properties that
            // access the path don't throw an error and can collect
            // dependencies
            // 确保 带有路径的数据可计算. 且收集依赖
            // 将路径上的值全部都转变为可观察.
            Observer.ensurePath(compiler.data, key)
            // 最终值的父. 有可能还会是带有路径的数据.
            var parentKey = key.slice(0, key.lastIndexOf('.'))
            // 
            if (!bindings[parentKey]) {
                // this is a nested value binding, but the binding for its parent
                // has not been created yet. We better create that one too.
                // 确保每个值都会有个对应的绑定
                compiler.createBinding(parentKey)
            }
        }
    }
    return binding
}

/**
 *  Define the getter/setter for a root-level property on the VM
 *  and observe the initial value
 * 在根 vm实例上, 定义 getter/setter. 观察初始值
 */
CompilerProto.defineProp = function (key, binding) {
    
    var compiler = this,
        data     = compiler.data,
        ob       = data.__emitter__

    // make sure the key is present in data
    // so it can be observed
    // 确定 该值是否在 data中. 确定可观察
    if (!(hasOwn.call(data, key))) {
        data[key] = undefined
    }

    // if the data object is already observed, but the key
    // is not observed, we need to add it to the observed keys.
    // 如果该值 可在 __emitter__ 中找到. 则表明该值已经被观察.
    // 否者将其转换
    if (ob && !(hasOwn.call(ob.values, key))) {
        Observer.convertKey(data, key)
    }

    binding.value = data[key]
    // 在当前编译器上 设置 getter/setter
    defGetSet(compiler.vm, key, {
        get: function () {
            return compiler.data[key]
        },
        set: function (val) {
            compiler.data[key] = val
        }
    })
}

/**
 *  Define a meta property, e.g. $index or $key,
 *  which is bindable but only accessible on the VM,
 *  not in the data.
 * 定义开头为 $的属性. 比如 $index, $key
 * 这两种数据只能在 vm里访问. 不能从数据里读取到该值
 */
CompilerProto.defineMeta = function (key, binding) {
    var vm = this.vm,
        ob = this.observer,
        value = binding.value = key in vm
            ? vm[key]
            : this.data[key]
    // remove initital meta in data, since the same piece
    // of data can be observed by different VMs, each have
    // its own associated meta info.
    // 移除 原先的 私有属性.
    delete this.data[key]
    // 给 该私有vm 设置一个 getter/setter
    defGetSet(vm, key, {
        get: function () {
            if (Observer.shouldGet) ob.emit('get', key)
            return value
        },
        set: function (val) {
            ob.emit('set', key, val)
            value = val
        }
    })
}

/**
 *  Define an expression binding, which is essentially
 *  an anonymous computed property
 * 定义一个表达式绑定. 本质上还是一个计算属性.
 */
CompilerProto.defineExp = function (key, binding, directive) {
    var filters = directive && directive.computeFilters && directive.filters,
        // 对指令解析, 取得一个解析后的 匿名方法.
        getter  = ExpParser.parse(key, this, null, filters)
    if (getter) {
        // 作为一个计算属性, 去处理绑定
        this.markComputed(binding, getter)
    }
}

/**
 *  Define a computed property on the VM
 * 将 options里的 computed 里的方法. 绑定到vm实例中
 * {string} key 键名
 * {binding} binding 捆绑指令
 * {function} value方法
 */
CompilerProto.defineComputed = function (key, binding, value) {
    // 作为一个计算属性, 去处理绑定
    this.markComputed(binding, value)
    // 在 实例vm上, 设置该属性的 get 与 setr
    defGetSet(this.vm, key, {
        get: binding.value.$get,
        set: binding.value.$set
    })
}

/**
 *  Process a computed property binding
 *  so its getter/setter are bound to proper context
 * 处理计算的属性绑定. 使得 计算属性里的 getter/setter 绑定到正确的上下文中
 * {binding} binding 捆绑类
 * {function} value 表达式封装的匿名方法. 或 computed对象里的方法
 */
CompilerProto.markComputed = function (binding, value) {
    binding.isComputed = true
    // bind the accessors to the vm
    // 将指令的方法.绑定到 当前实例vm上
    if (binding.isFn) {
        binding.value = value
    } else {
        if (typeof value === 'function') {
            // computed 可设置成一个 对象. 或者一个 {get(){}, set(){}}
            // 这里就是为了做这个区分.
            value = { $get: value }
        }
        binding.value = {
            // 代理绑定上下文
            $get: utils.bind(value.$get, this.vm),
            $set: value.$set
                ? utils.bind(value.$set, this.vm)
                : undefined
        }
    }
    // keep track for dep parsing later
    // 将捆绑指令推送到 计算属性中
    this.computed.push(binding)
}

/**
 *  Retrive an option from the compiler
 * 从编译器检索一个元素
 */
CompilerProto.getOption = function (type, id) {
    var opts = this.options,
        parent = this.parent,
        globalAssets = config.globalAssets
    // TODO: 报错 注释
    try {
        var result = (opts[type] && opts[type][id]) || (
            parent
                ? parent.getOption(type, id)
                : globalAssets[type] && globalAssets[type][id]
        )
    } catch (e) {
        // console.error(type, id)
    }
    return result
}

/**
 *  Emit lifecycle events to trigger hooks
 * 触发生命周期钩子
 */
CompilerProto.execHook = function (event) {
    event = 'hook:' + event
    this.observer.emit(event)
    this.emitter.emit(event)
}

/**
 *  Check if a compiler's data contains a keypath
 * 判断该值 是否在编译器上.
 */
CompilerProto.hasKey = function (key) {
    var baseKey = utils.baseKey(key)
    return hasOwn.call(this.data, baseKey) ||
        hasOwn.call(this.vm, baseKey)
}

/**
 *  Collect dependencies for computed properties
 * 收集计算属性依赖
 */
CompilerProto.parseDeps = function () {
    if (!this.computed.length) return
    DepsParser.parse(this.computed)
}

/**
 *  Do a one-time eval of a string that potentially
 *  includes bindings. It accepts additional raw data
 *  because we need to dynamically resolve v-component
 *  before a childVM is even compiled...
 * 接受一个只编译一次的字符串.
 * {string} exp 表达式
 * {object} data 组件的值
 * @return 表达式
 */
CompilerProto.eval = function (exp, data) {
    var parsed = TextParser.parseAttr(exp)
    return parsed
        ? ExpParser.eval(parsed, this, data)
        : exp
}

/**
 *  Resolve a Component constructor for an element
 *  with the data to be used
 * 获取组件的生成方法
 * {Element} node 节点
 * {Object} data 数据
 * {} test TODO: 表达式?
 * @return {function} 返回一个方法. 这个方法即会对组件 执行实例化.
 */
CompilerProto.resolveComponent = function (node, data, test) {

    // late require to avoid circular deps
    // 加载 viewmodel
    ViewModel = ViewModel || __webpack_require__(2)
    
    var exp     = utils.attr(node, 'component'),
        tagName = node.tagName,
        id      = this.eval(exp, data),
        tagId   = (tagName.indexOf('-') > 0 && tagName.toLowerCase()),
        Ctor    = this.getOption('components', id || tagId)

    if (id && !Ctor) {
        utils.warn('Unknown component: ' + id)
    }

    return test
        ? exp === ''
            ? ViewModel
            : Ctor
        : Ctor || ViewModel
}

/**
 *  Unbind and remove element
 * 摧毁
 */
CompilerProto.destroy = function () {

    // avoid being called more than once
    // this is irreversible!
    // 避免多次摧毁
    if (this.destroyed) return

    var compiler = this,
        i, key, dir, dirs, binding,
        vm          = compiler.vm,
        el          = compiler.el,
        directives  = compiler.dirs,
        computed    = compiler.computed,
        bindings    = compiler.bindings,
        delegators  = compiler.delegators,
        children    = compiler.children,
        parent      = compiler.parent
    // 触发生命周期钩子 beforeDestroy
    compiler.execHook('beforeDestroy')

    // unobserve data
    // 取消监听
    Observer.unobserve(compiler.data, '', compiler.observer)

    // unbind all direcitves
    // 解绑指令
    i = directives.length
    while (i--) {
        dir = directives[i]
        // if this directive is an instance of an external binding
        // e.g. a directive that refers to a variable on the parent VM
        // we need to remove it from that binding's directives
        // * empty and literal bindings do not have binding.
        // 指令所绑定的编译器 与当前编译器不一致
        if (dir.binding && dir.binding.compiler !== compiler) {
            dirs = dir.binding.dirs
            // 将该指令从外部的 编译器上移除掉
            if (dirs) dirs.splice(dirs.indexOf(dir), 1)
        }
        // 接触绑定
        dir.unbind()
    }

    // unbind all computed, anonymous bindings
    // 将计算属性生成的指令解绑
    i = computed.length
    while (i--) {
        computed[i].unbind()
    }

    // unbind all keypath bindings
    // 解绑所有的路径绑定类
    for (key in bindings) {
        binding = bindings[key]
        if (binding) {
            binding.unbind()
        }
    }

    // remove all event delegators
    // 移除事件绑定
    for (key in delegators) {
        el.removeEventListener(key, delegators[key].handler)
    }

    // destroy all children
    // 有子组件的话, 全部都调用子组件的 destroy
    i = children.length
    while (i--) {
        children[i].destroy()
    }

    // remove self from parent
    // 如果被移除的是 某个子组件, 则将自身从父组件里移除
    if (parent) {
        parent.children.splice(parent.children.indexOf(compiler), 1)
    }

    // finally remove dom element
    // 移除掉 DOM 元素
    if (el === document.body) {
        el.innerHTML = ''
    } else {
        vm.$remove()
    }
    // 取消 dom元素上的 vm引用
    el.vue_vm = null
    // 标记为已被摧毁
    compiler.destroyed = true
    // emit destroy hook
    // 触发生命钩子 afterDestroy
    compiler.execHook('afterDestroy')

    // finally, unregister all listeners
    // 取消编译器上 观察者 和触发器 所有的监听事件
    compiler.observer.off()
    compiler.emitter.off()
}

// Helpers --------------------------------------------------------------------

/**
 *  shorthand for getting root compiler
 * 获取 编译器的根节点
 */
function getRoot (compiler) {
    while (compiler.parent) {
        compiler = compiler.parent
    }
    return compiler
}

/**
 *  for convenience & minification
 * 在对象上设置属性以及值
 */
function defGetSet (obj, key, def) {
    Object.defineProperty(obj, key, def)
}

module.exports = Compiler

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

var Batcher        = __webpack_require__(3),
    bindingBatcher = new Batcher(),
    bindingId      = 1
    
/**
 *  Binding class.
 *
 *  each property on the viewmodel has one corresponding Binding object
 *  which has multiple directive instances on the DOM
 *  and multiple computed property dependents
 * 捆绑类.
 * 将指令, 以及 监听全部都连接起来.
 * 因此, 在值更新之后, 可通知到 vue 更新调用指令的update方法.
 * @param {object|compiler} compiler 
 * @param {string} key 表达式. 或 变量字符串
 *                  | 当以下的 isExp为false. 即非表达式.
 *                  | 则该字段表示为变量path.
 * @param {boolean} isExp 是否为表达式
 * @param {boolean} isFn 是否为方法
 */
function Binding (compiler, key, isExp, isFn) {
    // binding的uuid
    this.id = bindingId++
    // 默认值为空
    this.value = undefined
    // 是否表达式
    this.isExp = !!isExp
    // 是否为方法
    this.isFn = isFn
    // 当为非表达式, 且变量path里没有 . 时候. 表明该变量所指的值在根上
    this.root = !this.isExp && key.indexOf('.') === -1
    // 编译器
    this.compiler = compiler
    // key值
    this.key = key
    // 依赖
    this.dirs = []
    // 对应的值的监听数组
    this.subs = []
    // TODO: 啥东西
    this.deps = []
    // 绑定状态值. 一开始设置为绑定.
    this.unbound = false
}

var BindingProto = Binding.prototype

/**
 *  Update value and queue instance updates.
 * 绑定更新.
 */
BindingProto.update = function (value) {
    // 判断是否为可计算.或者方法
    if (!this.isComputed || this.isFn) {
        this.value = value
    }
    // 如果存在收集到的指令 或 监听...
    // 则将任务推送进 批处理的队列里.
    if (this.dirs.length || this.subs.length) {
        var self = this
        bindingBatcher.push({
            id: this.id,
            execute: function () {
                // 推入批处理
                if (!self.unbound) {
                    self._update()
                }
            }
        })
    }
}

/**
 *  Actually update the directives.
 * 对指令执行更新操作.
 */
BindingProto._update = function () {
    var i = this.dirs.length,
        value = this.val()
    while (i--) {
        this.dirs[i].update(value)
    }
    this.pub()
}

/**
 *  Return the valuated value regardless
 *  of whether it is computed or not
 * 返回值.
 */
BindingProto.val = function () {
    return this.isComputed && !this.isFn
        ? this.value.$get()
        : this.value
}

/**
 *  Notify computed properties that depend on this binding
 *  to update themselves
 * 通知依赖. 调用该方法可通知 vue 将 subs数组里的监听的指令方法, 全部更新
 * 然后当值变化后, 批量更新 subs 数组里的指令, 进行批量更新
 */
BindingProto.pub = function () {
    var i = this.subs.length
    while (i--) {
        this.subs[i].update()
    }
}

/**
 *  Unbind the binding, remove itself from all of its dependencies
 * 解除绑定. 将所有的依赖关系 进行解除绑定
 */
BindingProto.unbind = function () {
    // Indicate this has been unbound.
    // It's possible this binding will be in
    // the batcher's flush queue when its owner
    // compiler has already been destroyed.
    this.unbound = true
    var i = this.dirs.length
    while (i--) {
        this.dirs[i].unbind()
    }
    i = this.deps.length
    var subs
    while (i--) {
        subs = this.deps[i].subs
        subs.splice(subs.indexOf(this), 1)
    }
}

module.exports = Binding

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 解析 依赖.
 */

var Emitter  = __webpack_require__(4),
    utils    = __webpack_require__(0),
    Observer = __webpack_require__(6),
    // 仅仅创建一个. 收集依赖后即时清空
    catcher  = new Emitter()

/**
 *  Auto-extract the dependencies of a computed property
 *  by recording the getters triggered when evaluating it.
 * 解析 表达式 与 computed.
 * (表达式, 与 computed 其实本质是一样的. 只是一个写在template上, 一个写在js里)
 * 记录该 表达式里 所调用的 依赖值.
 * {Binding} bindding 捆绑类
 */
function catchDeps (binding) {
    if (binding.isFn) return
    utils.log('\n- ' + binding.key)
    var got = utils.hash()
    // 依赖
    binding.deps = []
    catcher.on('get', function (dep) {
        var has = got[dep.key]
        if (
            // avoid duplicate bindings
            // 避免重复绑定
            (has && has.compiler === dep.compiler) ||
            // avoid repeated items as dependency
            // since all inside changes trigger array change too
            /**
             * 当数组循环时候, vue 采用将数组里的元素 new 一个新的对象出来.
             * 并且设置repeat为true.以及设置 父编译器为当前编译器
             * 详情查看(./repeat.js)
             * 因此判断 父编译器与当前是否一致, 避免重复绑定.
             */
            (dep.compiler.repeat && dep.compiler.parent === binding.compiler)
        ) {
            return
        }
        got[dep.key] = dep
        utils.log('  - ' + dep.key)
        // TODO: deps
        binding.deps.push(dep)
        // TODO: subs
        dep.subs.push(binding)
    })
    // 触发编译器上的观察者.
    // compiler里 绑定的 on 另一个 'get'事件.
    // 会导致触发 依赖收集的 get事件.
    binding.value.$get()
    catcher.off('get')
}

module.exports = {

    /**
     *  the observer that catches events triggered by getters
     * 获取私有
     */
    catcher: catcher,

    /**
     *  parse a list of computed property bindings
     * 从一个绑定类集合里 收集依赖
     */
    parse: function (bindings) {
        utils.log('\nparsing dependencies...')
        Observer.shouldGet = true
        bindings.forEach(catchDeps)
        Observer.shouldGet = false
        utils.log('\ndone.')
    }
    
}

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Vue 指令系统
 * Vue 的指令 是指 带有 v- 前缀的语法.
 * 比如 v-if v-show 等
 * 将dom上的指令以及表达式, 生成一条新的指令.
 * 而后通过指令的 update, 该指令所指的 dom的值改变.
 * 也因指令操作的为 dom节点, 而非组件.
 * 从而达到最小程度更新DOM.
 */
var utils      = __webpack_require__(0),
    /**
     * 该值里包含了各种各样的指令.
     * 每个指令 可为方法. 或对象.
     */
    directives = __webpack_require__(14),
    // 指令ID. 每绑定一次则执行 ++. 确保每个指令ID都是独一无二.
    dirId      = 1,

    // Regexes!

    // 以下正则. 用来区分指令里多个参数.
    // regex to split multiple directive expressions
    // split by commas, but ignore commas within quotes, parens and escapes.
    // 逗号分隔. 引号里的 逗号不能进行分隔
    SPLIT_RE        = /(?:['"](?:\\.|[^'"])*['"]|\((?:\\.|[^\)])*\)|\\.|[^,])+/g,

    // match up to the first single pipe, ignore those within quotes.
    // 抓取管道里的第一个内容
    KEY_RE          = /^(?:['"](?:\\.|[^'"])*['"]|\\.|[^\|]|\|\|)+/,
    // 抓取带有 : 的键值对
    ARG_RE          = /^([\w-$ ]+):(.+)$/,
    // 抓取过滤器的名称. 即 开头为 | 的内容
    FILTERS_RE      = /\|[^\|]+/g,
    // 抓取 过滤器的 参数
    FILTER_TOKEN_RE = /[^\s']+|'[^']+'|[^\s"]+|"[^"]+"/g,
    // 抓取 $parent. 和 $root.
    NESTING_RE      = /^\$(parent|root)\./,
    // 抓取单个变量
    SINGLE_VAR_RE   = /^[\w\.$]+$/

/**
 *  Directive class
 *  represents a single directive instance in the DOM
 * 指令 构造方法.
 * 代表 DOM里的一个 指令实例
 * @param {string} dirname 指令名称
 * @param {object|function} definition 指令的定义. 可查看 directives里的内容
 * @param {string} expression 指令的表达式.
 *                              即 v-text = 'aaa + 1'
 *                              aaa + 1 即表达式
 * @param {string} rawKey TODO:总是与上面的一致. 还不知道叫什么好
 * @param {object|compiler} compiler 编译器
 * @param {node} node 节点的引用.
 * 
 * 该指令系统将 指令, 表达式, 节点引用解耦
 * 从而达到以后开发者也能为其自定义指令.
 */
function Directive (dirname, definition, expression, rawKey, compiler, node) {
    // 指令ID. 每绑定一次则执行 ++. 确保每个指令ID都是独一无二.
    this.id             = dirId++
    // 指令名称
    this.name           = dirname
    // 自身编译器
    this.compiler       = compiler
    // 指令所指的 vm
    this.vm             = compiler.vm
    // 指令要改的元素
    this.el             = node
    // TODO:是否计算过滤器
    this.computeFilters = false
    // 表达式是否为空. v-cloak的表达式 即为空.
    var isEmpty   = expression === ''

    // mix in properties from the directive definition
    // 将指令的属性, 扩展到当前下.
    if (typeof definition === 'function') {
        this[isEmpty ? 'bind' : '_update'] = definition
    } else {
        for (var prop in definition) {
            if (prop === 'unbind' || prop === 'update') {
                this['_' + prop] = definition[prop]
            } else {
                this[prop] = definition[prop]
            }
        }
    }

    // empty expression, we're done.
    // 当表达式为空时, 直接完成. 不再执行.
    // 目前发现 只有 v-cloak 的表达式为空
    if (isEmpty || this.isEmpty) {
        this.isEmpty = true
        return
    }
    // 获取对应的表达式
    this.expression = (
        this.isLiteral
            ? compiler.eval(expression)
            : expression
    ).trim()
    // 解析参数. 设置 this.key
    parseKey(this, rawKey)
    /**
     * 表达式的第一个参数被删除后, 剩下的参数通过正则 抓取出来
     * aaa | bbb | ccc => | bbb | ccc
     */
    var filterExps = this.expression.slice(rawKey.length).match(FILTERS_RE)
    if (filterExps) {
        this.filters = []
        for (var i = 0, l = filterExps.length, filter; i < l; i++) {
            filter = parseFilter(filterExps[i], this.compiler)
            if (filter) {
                // 将过滤器对象传入过滤器数组
                this.filters.push(filter)
                if (filter.apply.computed) {
                    // some special filters, e.g. filterBy & orderBy,
                    // can involve VM properties and they often need to
                    // be computed.
                    // filterBy & orderBy 两个特殊的过滤器 需要计算.
                    this.computeFilters = true
                }
            }
        }
        if (!this.filters.length) this.filters = null
    } else {
        this.filters = null
    }
    // 是否为表达式
    this.isExp =
        this.computeFilters ||
        !SINGLE_VAR_RE.test(this.key) ||
        NESTING_RE.test(this.key)

}

var DirProto = Directive.prototype

/**
 *  parse a key, extract argument and nesting/root info
 * 解析参数. 将参数里的 key:value 抓取出来
 */
function parseKey (dir, rawKey) {
    var key = rawKey
    if (rawKey.indexOf(':') > -1) {
        var argMatch = rawKey.match(ARG_RE)
        key = argMatch
            ? argMatch[2].trim()
            : key
        dir.arg = argMatch
            ? argMatch[1].trim()
            : null
    }
    dir.key = key
}

/**
 *  parse a filter expression
 * 解析过滤器的表达式
 * @param {string} filter 过滤
 * @param {object|compiler} compiler 编译器
 * @return {object} 返回过滤器对象
 *              | {string} name 过滤器名称
 *              | {function} 过滤器方法
 *              | {any} args 过滤器参数
 */
function parseFilter (filter, compiler) {
    // 获取过滤器参数
    var tokens = filter.slice(1).match(FILTER_TOKEN_RE)
    if (!tokens) return

    var name = tokens[0],
        // 生成一个过滤器的执行闭包
        apply = compiler.getOption('filters', name)
    if (!apply) {
        utils.warn('Unknown filter: ' + name)
        return
    }

    return {
        name  : name,
        apply : apply,
        args  : tokens.length > 1
                ? tokens.slice(1)
                : null
    }
}

/**
 *  called when a new value is set 
 *  for computed properties, this will only be called once
 *  during initialization.
 * 指令更新. Vue通过调用指令, 来更新DOM.
 */
DirProto.update = function (value, init) {
    var type = utils.typeOf(value)
    if (init || value !== this.value || type === 'Object' || type === 'Array') {
        this.value = value
        if (this._update) {
            this._update(
                // 如果存在过滤器, 则先执行 applyFilters 方法, 
                // 来将值处理完毕后再传入 _update.
                this.filters && !this.computeFilters
                    ? this.applyFilters(value)
                    : value,
                init
            )
        }
    }
}

/**
 *  pipe the value through filters
 * 将值 通过过滤处理
 * @param {string} value 过滤前的值
 * @return {string} 过滤处理后的值
 */
DirProto.applyFilters = function (value) {
    var filtered = value, filter
    // 直接遍历过滤器数组. 将值 经过一个个过滤器处理
    for (var i = 0, l = this.filters.length; i < l; i++) {
        filter = this.filters[i]
        filtered = filter.apply.apply(this.vm, [filtered].concat(filter.args))
    }
    return filtered
}

/**
 *  Unbind diretive
 * 解绑指令
 */
DirProto.unbind = function () {
    // this can be called before the el is even assigned...
    // 解绑指令, 得确定 el 或 vm 必须存在. 严防报错
    if (!this.el || !this.vm) return
    // 解绑. 一般 _unbind 里. 是摧毁 一个vue实例或者移除事件等.
    if (this._unbind) this._unbind()
    // 顺带移除自身的一些属性
    this.vm = this.el = this.binding = this.compiler = null
}

// exposed methods ------------------------------------------------------------

/**
 *  split a unquoted-comma separated expression into
 *  multiple clauses
 * 利用 ',' 将表达式分割成多个表达式
 */
Directive.split = function (exp) {
    return exp.indexOf(',') > -1
        ? exp.match(SPLIT_RE) || ['']
        : [exp]
}

/**
 *  make sure the directive and expression is valid
 *  before we create an instance
 * 在创建实例之前, 先进行解析. 保证实例有效
 * @param {string} dirname 指令名称
 * @param {string} expression 指令的表达式
 * @param {object|compiler} compiler 编译器
 * @param {node} node 节点的引用.
 */
Directive.parse = function (dirname, expression, compiler, node) {

    var dir = compiler.getOption('directives', dirname) || directives[dirname]
    // 指令判断
    if (!dir) {
        utils.warn('unknown directive: ' + dirname)
        return
    }

    var rawKey
    if (expression.indexOf('|') > -1) {
        var keyMatch = expression.match(KEY_RE)
        if (keyMatch) {
            rawKey = keyMatch[0].trim()
        }
    } else {
        rawKey = expression.trim()
    }
    
    // have a valid raw key, or be an empty directive
    // 指令内容不能为空
    if (rawKey || expression === '') {
        return new Directive(dirname, dir, expression, rawKey, compiler, node)
    } else {
        utils.warn('invalid directive expression: ' + expression)
    }
}

module.exports = Directive

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * html 有两种.
 * 一种是指令 v-html
 * 一种是 {{{}}}
 */
var guard = __webpack_require__(0).guard,
    slice = [].slice
module.exports = {
    // 绑定 默认放到 div 标签中
    bind: function () {
        // a comment node means this is a binding for
        // {{{ inline unescaped html }}}
        // 如果是 通过 {{{}}}去绑定的.
        // this.el 将会是一个注释.
        // <!--v-html-->. 用来做位置标记
        // 需要创建一个 holder属性.以及节点 来暂存生成的 dom
        if (this.el.nodeType === 8) {
            // hold nodes
            this.holder = document.createElement('div')
            this.nodes = []
        }
    },

    update: function (value) {
        value = guard(value)
        if (this.holder) {
            // {{{}}} 更新
            this.swap(value)
        } else {
            // v-html 更新. 直接将 dom里的 整个替换掉
            this.el.innerHTML = value
        }
    },
    // {{{}}} 更新
    swap: function (value) {
        var parent = this.el.parentNode,
            holder = this.holder,
            nodes = this.nodes,
            i = nodes.length, l
        // 将父类的移除掉节点. 因为有其它节点. 所以通过以下方式去移除
        while (i--) {
            parent.removeChild(nodes[i])
        }
        // 重新放入节点
        holder.innerHTML = value
        nodes = this.nodes = slice.call(holder.childNodes)
        for (i = 0, l = nodes.length; i < l; i++) {
            // 将元素插入到 <!--v-html--> 前.
            parent.insertBefore(nodes[i], this.el)
        }
    }
}

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * v-if 是采取将 起本身元素 解析为一个实例.
 * 而后对该实例进行 显示隐藏操作.
 * 通过$before 来保证实现过渡效果
 * 由于是一个实例. 因此每次切换的时候都会对其进行实例化.
 * 导致切换的开销会变得很大...
 * 但是因为它只是在 值为 true时, 才会开始渲染. 因此有一种惰性.
 * 使得初始渲染基本为0.
 */
var utils    = __webpack_require__(0)

module.exports = {

    bind: function () {
        
        this.parent = this.el.parentNode
        // 标记
        this.ref    = document.createComment('vue-if')
        // 获得 编译器生成器
        this.Ctor   = this.compiler.resolveComponent(this.el)

        // insert ref
        // 插入标记
        this.parent.insertBefore(this.ref, this.el)
        // 移除原先模版
        this.parent.removeChild(this.el)
        // v-if 不能与 v-view 以及 v-repeat 同时存在
        // 因为都进行了组件的实例化
        if (utils.attr(this.el, 'view')) {
            utils.warn('Conflict: v-if cannot be used together with v-view')
        }
        if (utils.attr(this.el, 'repeat')) {
            utils.warn('Conflict: v-if cannot be used together with v-repeat')
        }
    },
    /**
     * {boolean} value 是否显示
     * 因为这个的
     */
    update: function (value) {
        if (!value) {
            // 摧毁解绑
            this._unbind()
        } else if (!this.childVM) {
            // 如果还没有创建子组件. 则新建一个且将实例赋值给 childVM
            this.childVM = new this.Ctor({
                el: this.el.cloneNode(true),
                parent: this.vm
            })
            if (this.compiler.init) {
                // 这里插入不会产生过渡效果
                this.parent.insertBefore(this.childVM.$el, this.ref)
            } else {
                // $before 会执行过渡方法
                this.childVM.$before(this.ref)
            }
        }
        
    },

    unbind: function () {
        // 解绑. 如果有子组件时. 执行 摧毁方法.
        // 而destroy 会自动摧毁本身以及全部的子组件.
        if (this.childVM) {
            this.childVM.$destroy()
            this.childVM = null
        }
    }
}

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 该值里包含了各种各样的指令.
 * 每个指令 可为方法. 或对象.
 * 当指令为方法, 则通过 isEmpty 将该方法直接添加到 bind 或 update
 * (直接写个对象不也一样?)
 * 当指令为对象时, 则对对象下的属性有进行约定.
 * {boolean} isLiteral 是否转为表达式.
 * {function} bind 生成指令后, 将该指令绑定到 dom 上.
 * {function} unbind 解绑指令.
 * {function} update 通过该方法, 更新dom
 */
var utils      = __webpack_require__(0),
    config     = __webpack_require__(1),
    transition = __webpack_require__(5)

module.exports = {

    on        : __webpack_require__(16),
    repeat    : __webpack_require__(18),
    model     : __webpack_require__(15),
    'if'      : __webpack_require__(13),
    'with'    : __webpack_require__(21),
    html      : __webpack_require__(12),
    style     : __webpack_require__(19),
    partial   : __webpack_require__(17),
    view      : __webpack_require__(20),

    // 组件创建以及摧毁
    component : {
        isLiteral: true,
        bind: function () {
            if (!this.el.vue_vm) {
                this.childVM = new this.Ctor({
                    el: this.el,
                    parent: this.vm
                })
            }
        },
        unbind: function () {
            if (this.childVM) {
                this.childVM.$destroy()
            }
        }
    },

    attr: {
        // 值 读取
        bind: function () {
            var params = this.vm.$options.paramAttributes
            this.isParam = params && params.indexOf(this.arg) > -1
        },
        // 更新
        update: function (value) {
            if (value || value === 0) {
                this.el.setAttribute(this.arg, value)
            } else {
                this.el.removeAttribute(this.arg)
            }
            if (this.isParam) {
                this.vm[this.arg] = utils.checkNumber(value)
            }
        }
    },

    text: {
        // 绑定元素或者文字节点. 更改文字的时候属性是不一样的.
        bind: function () {
            this.attr = this.el.nodeType === 3
                ? 'nodeValue'
                : 'textContent'
        },
        // 更新文字. utils.guard 保证 没有值时, 输出 空白
        update: function (value) {
            this.el[this.attr] = utils.guard(value)
        }
    },

    show: function (value) {
        // 改变display, 触发 过渡
        // 不会引起子组件重新渲染
        var el = this.el,
            target = value ? '' : 'none',
            change = function () {
                el.style.display = target
            }
        transition(el, value ? 1 : -1, change, this.compiler)
    },

    'class': function (value) {
        // 添加删除类
        if (this.arg) {
            utils[value ? 'addClass' : 'removeClass'](this.el, this.arg)
        } else {
            if (this.lastVal) {
                utils.removeClass(this.el, this.lastVal)
            }
            if (value) {
                utils.addClass(this.el, value)
                this.lastVal = value
            }
        }
    },

    cloak: {
        // v-cloak 参数为空
        isEmpty: true,
        // 观察 hook:ready 事件. 完成后直接移除 v-cloak.
        bind: function () {
            var el = this.el
            this.compiler.observer.once('hook:ready', function () {
                el.removeAttribute(config.prefix + '-cloak')
            })
        }
    },

    ref: {
        isLiteral: true,
        // 将 v-ref 里的表达式, 加 $作为父组件的一个属性, 指向该组件本身
        bind: function () {
            var id = this.expression
            if (id) {
                this.vm.$parent.$[id] = this.vm
            }
        },
        // 移除父组件上的值, 取消对该组件的引用
        unbind: function () {
            var id = this.expression
            if (id) {
                delete this.vm.$parent.$[id]
            }
        }
    }

}

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Vue 的双向绑定
 */
var utils = __webpack_require__(0),
    isIE9 = navigator.userAgent.indexOf('MSIE 9.0') > 0,
    filter = [].filter

/**
 *  Returns an array of values from a multiple select
 * 从一个 select 元素里. 取出被选中的值
 */
function getMultipleSelectOptions (select) {
    return filter
        .call(select.options, function (option) {
            return option.selected
        })
        .map(function (option) {
            return option.value || option.text
        })
}

module.exports = {

    bind: function () {

        var self = this,
            el   = self.el,
            // input 标签类型
            type = el.type,
            // input 标签名称
            tag  = el.tagName

        self.lock = false
        self.ownerVM = self.binding.compiler.vm

        // determine what event to listen to
        // 确定监听的事件.
        // 如果选项开启 lazy, 或者 checkbox radio select. 均采用 change 事件.
        // 否者 默认监听 input 事件
        self.event =
            (self.compiler.options.lazy ||
            tag === 'SELECT' ||
            type === 'checkbox' || type === 'radio')
                ? 'change'
                : 'input'

        // determine the attribute to change when updating
        // 确定值的更新方式.
        // checkbox 更新为 调整 节点的checked.
        // input select 以及 textarea 为 更新 节点的 value
        // 默认调整 innerHTML
        self.attr = type === 'checkbox'
            ? 'checked'
            : (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
                ? 'value'
                : 'innerHTML'

        // select[multiple] support
        // 支持多选
        if(tag === 'SELECT' && el.hasAttribute('multiple')) {
            this.multi = true
        }
        // 锁. 为中文输入做优化
        var compositionLock = false
        // 锁定
        self.cLock = function () {
            compositionLock = true
        }
        // 解锁
        self.cUnlock = function () {
            compositionLock = false
        }
        // 注册事件
        /**
         * compositionstart compositionend compositionupdate
         * 专门为中文输入做优化.
         * 当开始输入的时候, 出现选词框的时, 会触发 start.
         * 输入时候会触发 update
         * 输入完成后 触发 end.
         */
        el.addEventListener('compositionstart', this.cLock)
        el.addEventListener('compositionend', this.cUnlock)

        // attach listener
        self.set = self.filters
            ? function () {
                // 中文输入时 禁止
                if (compositionLock) return
                // if this directive has filters
                // we need to let the vm.$set trigger
                // update() so filters are applied.
                // therefore we have to record cursor position
                // so that after vm.$set changes the input
                // value we can put the cursor back at where it is
                // 如果 指令有过滤器
                var cursorPos
                try { cursorPos = el.selectionStart } catch (e) {}

                self._set()

                // since updates are async
                // we need to reset cursor position async too
                utils.nextTick(function () {
                    if (cursorPos !== undefined) {
                        // 当dom更新完之后, 自动定位光标.
                        el.setSelectionRange(cursorPos, cursorPos)
                    }
                })
            }
            : function () {
                if (compositionLock) return
                // no filters, don't let it trigger update()
                // 没有过滤器的情况. 锁定.
                self.lock = true

                self._set()

                utils.nextTick(function () {
                    self.lock = false
                })
            }
        // 监听 事件. 以及 触发更新(这一步即实现了双向绑定)
        el.addEventListener(self.event, self.set)

        // fix shit for IE9
        // since it doesn't fire input on backspace / del / cut
        // IE9 监听事件 不支持 backspace / del / cut 事件. 这一步做修正.
        // 监听了 cut 以及 keyup 事件
        if (isIE9) {
            self.onCut = function () {
                // cut event fires before the value actually changes
                utils.nextTick(function () {
                    self.set()
                })
            }
            self.onDel = function (e) {
                if (e.keyCode === 46 || e.keyCode === 8) {
                    self.set()
                }
            }
            el.addEventListener('cut', self.onCut)
            el.addEventListener('keyup', self.onDel)
        }
    },
    // 更新值.
    _set: function () {
        this.ownerVM.$set(
            this.key, this.multi
                // 多选
                ? getMultipleSelectOptions(this.el)
                : this.el[this.attr]
        )
    },
    /**
     * 更新. 这里是完成 从 js数据到 元素节点的更新.
     */
    update: function (value, init) {
        /* jshint eqeqeq: false */
        // sync back inline value if initial data is undefined
        if (init && value === undefined) {
            return this._set()
        }
        if (this.lock) return
        var el = this.el
        if (el.tagName === 'SELECT') { // select dropdown
            el.selectedIndex = -1
            // 只有多选的值 返回是一个数组. 对值进行批量更新
            if(this.multi && Array.isArray(value)) {
                value.forEach(this.updateSelect, this)
            } else {
                // 单选则只需要执行一次
                this.updateSelect(value)
            }
        } else if (el.type === 'radio') { // radio button
            // 单选
            el.checked = value == el.value
        } else if (el.type === 'checkbox') { // checkbox
            // 复选框
            el.checked = !!value
        } else {
            // 更新该值. 
            el[this.attr] = utils.guard(value)
        }
    },
    // 更新选择. 值改变的时候, 触发 select 节点的更新
    updateSelect: function (value) {
        /* jshint eqeqeq: false */
        // setting <select>'s value in IE9 doesn't work
        // we have to manually loop through the options
        var options = this.el.options,
            i = options.length
        while (i--) {
            // 判断传入的值与 options的值是否相同. 相同则为 选中.
            if (options[i].value == value) {
                options[i].selected = true
                break
            }
        }
    },
    // 解绑. 取消所有监听事件
    unbind: function () {
        var el = this.el
        el.removeEventListener(this.event, this.set)
        el.removeEventListener('compositionstart', this.cLock)
        el.removeEventListener('compositionend', this.cUnlock)
        if (isIE9) {
            el.removeEventListener('cut', this.onCut)
            el.removeEventListener('keyup', this.onDel)
        }
    }
}

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 绑定事件
 */
var utils    = __webpack_require__(0)

module.exports = {
    // 方法
    isFn: true,
    // 绑定上下文
    bind: function () {
        this.context = this.binding.isExp
            ? this.vm
            : this.binding.compiler.vm
    },

    update: function (handler) {
        // 判断是否为 方法.
        if (typeof handler !== 'function') {
            utils.warn('Directive "on" expects a function value.')
            return
        }
        // 解绑 每次更新后, 需要接触原先的绑定. 再绑定新的方法.
        // 确保只绑定一次.
        this._unbind()
        var vm = this.vm,
            context = this.context
        this.handler = function (e) {
            e.targetVM = vm
            context.$event = e
            // 执行方法.
            var res = handler.call(context, e)
            context.$event = null
            return res
        }
        // 绑定方法
        this.el.addEventListener(this.arg, this.handler)
    },

    unbind: function () {
        // 解绑
        this.el.removeEventListener(this.arg, this.handler)
    }
}

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * v-partial = {{partialId}}
 * data: {
 *  partialId: 'temp'
 * },
 * partials: {
 *          // 片段中也可引用 变量
 *   temp: '<p>{{test}}</p>'
 * }
 */
var utils = __webpack_require__(0)

module.exports = {

    isLiteral: true,

    bind: function () {

        var compiler = this.compiler,
            id = this.expression
        if (!id) return
        // 读取表达式里的 变量.
        // 当表达式为 yield 的时候. 读取原先的 html 片段
        var partial = id === 'yield'
            ? this.compiler.rawContent
            // 查找对应的片段
            : this.compiler.getOption('partials', id)
        // 片段为空的时候 警告报错
        if (!partial) {
            utils.warn('Unknown partial: ' + id)
            return
        }
        // 复制一份新的片段
        partial = partial.cloneNode(true)

        // comment ref node means inline partial
        if (this.el.nodeType === 8) {

            // keep a ref for the partial's content nodes
            // 将片段插入到 dom中
            var nodes = [].slice.call(partial.childNodes),
                ref = this.el,
                parent = ref.parentNode
            parent.insertBefore(partial, ref)
            parent.removeChild(ref)
            // compile partial after appending, because its children's parentNode
            // will change from the fragment to the correct parentNode.
            // This could affect directives that need access to its element's parentNode.
            // 将node 节点编译
            nodes.forEach(compiler.compile, compiler)

        } else {

            // just set innerHTML...
            // 元素下为空的时候直接插入
            this.el.innerHTML = ''
            this.el.appendChild(partial.cloneNode(true))

        }
    }

}

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 循环
 * 
 */
var utils      = __webpack_require__(0),
    config     = __webpack_require__(1)

module.exports = {

    bind: function () {
        // 独一无二的标记
        this.identifier = '$repeat' + this.id

        var el   = this.el,
            ctn  = this.container = el.parentNode

        // extract child Id, if any
        // 取出节点里的内容 并且编译
        this.childId = this.compiler.eval(utils.attr(el, 'ref'))

        // create a comment node as a reference node for DOM insertions
        // 创建一个路标注释
        this.ref = document.createComment(config.prefix + '-repeat-' + this.key)
        ctn.insertBefore(this.ref, el)
        ctn.removeChild(el)
        // 定义
        this.initiated = false
        this.collection = null
        this.vms = null

    },

    update: function (collection) {
        // v-repeat 支持 循环 数组和对象
        // 这一步就是将 对象转为数组
        if (utils.typeOf(collection) === 'Object') {
            collection = utils.objectToArray(collection)
        }

        // if initiating with an empty collection, we need to
        // force a compile so that we get all the bindings for
        // dependency extraction.
        // 如果 收集到的依赖为空的话. 那就通过 创建子组件的方式 收集依赖
        if (!this.initiated && (!collection || !collection.length)) {
            this.dryBuild()
        }

        // keep reference of old data and VMs
        // so we can reuse them if possible
        // 将现有的 子组件实例 传到一个 旧实例中
        this.oldVMs = this.vms
        // 同样收集也是
        this.oldCollection = this.collection
        collection = this.collection = collection || []
        // 判断 收集器里的长度. 以及判断 元素是否为 对象
        var isObject = collection[0] && utils.typeOf(collection[0]) === 'Object'
        // 判断旧的收集器里是否存在元素.
        // 从而决定是进行 diff 操作 还是 init 操作
        this.vms = this.oldCollection
            ? this.diff(collection, isObject)
            : this.init(collection, isObject)
        // 父组件下 添加该子组件集合
        if (this.childId) {
            this.vm.$[this.childId] = this.vms
        }
    },

    /**
     *  Run a dry build just to collect bindings
     * 循环创建子组件
     */
    dryBuild: function () {
        var el = this.el.cloneNode(true),
            Ctor = this.compiler.resolveComponent(el)
        new Ctor({
            el     : el,
            parent : this.vm,
            compilerOptions: {
                repeat: true
            }
        // TODO: $destroy 有什么用?
        }).$destroy()
        // 初始化完成
        this.initiated = true
    },
    // 初始化
    init: function (collection, isObject) {
        var vm, vms = []
        // 创建一个数组
        for (var i = 0, l = collection.length; i < l; i++) {
            // 创建 vm实例
            vm = this.build(collection[i], i, isObject)
            vms.push(vm)
            if (this.compiler.init) {
                this.container.insertBefore(vm.$el, this.ref)
            } else {
                vm.$before(this.ref)
            }
        }
        return vms
    },

    /**
     *  Diff the new array with the old
     *  and determine the minimum amount of DOM manipulations.
     * 差异化.
     */
    diff: function (newCollection, isObject) {

        var i, l, item, vm,
            oldIndex,
            targetNext,
            currentNext,
            nextEl,
            ctn    = this.container,
            oldVMs = this.oldVMs,
            vms    = []

        vms.length = newCollection.length

        // first pass, collect new reused and new created
        // 第一步, 收集依赖 创建vm. 标记 reused
        // 比较新旧数据, 从数组 或对象里找出可复用的数据
        for (i = 0, l = newCollection.length; i < l; i++) {
            item = newCollection[i]
            if (isObject) {
                item.$index = i
                if (item[this.identifier]) {
                    // this piece of data is being reused.
                    // record its final position in reused vms
                    // 标记 可复用
                    item.$reused = true
                } else {
                    // 没有则创建一个
                    vms[i] = this.build(item, i, isObject)
                }
            } else {
                // we can't attach an identifier to primitive values
                // so have to do an indexOf...
                // 从原先的dom里查找内容
                oldIndex = indexOf(oldVMs, item)
                if (oldIndex > -1) {
                    // record the position on the existing vm
                    // 在老的数组上标记为 可复用
                    oldVMs[oldIndex].$reused = true
                    oldVMs[oldIndex].$data.$index = i
                } else {
                    // 没有则创建一个
                    vms[i] = this.build(item, i, isObject)
                }
            }
        }

        // second pass, collect old reused and destroy unused
        // 第二步, 收集老的 标记为 reused 以及 摧毁掉的unused
        // 比较新老的 vm 实例集合.在 新的 vm 实例集合里比较
        for (i = 0, l = oldVMs.length; i < l; i++) {
            vm = oldVMs[i]
            item = vm.$data
            if (item.$reused) {
                // 将数据上的 标记 转移到 vm实例上
                vm.$reused = true
                delete item.$reused
            }
            if (vm.$reused) {
                // 可复用的 则更新
                // update the index to latest
                vm.$index = item.$index
                // the item could have had a new key
                if (item.$key && item.$key !== vm.$key) {
                    vm.$key = item.$key
                }
                // 替换掉 某个 vm实例
                vms[vm.$index] = vm
            } else {
                // this one can be destroyed.
                // 不可复用的则摧毁掉且执行摧毁
                delete item[this.identifier]
                vm.$destroy()
            }
        }

        // final pass, move/insert DOM elements
        // 最后步, 移动或者添加 dom节点
        // 根据之前新生成的 vm 集合. 移动或添加dom节点
        i = vms.length
        while (i--) {
            vm = vms[i]
            item = vm.$data
            targetNext = vms[i + 1]
            if (vm.$reused) {
                nextEl = vm.$el.nextSibling
                // destroyed VMs' element might still be in the DOM
                // due to transitions
                // 当下一个存在 vue_vm 以及 非 标记注释时, 继续寻找下一个
                while (!nextEl.vue_vm && nextEl !== this.ref) {
                    nextEl = nextEl.nextSibling
                }
                currentNext = nextEl.vue_vm
                if (currentNext !== targetNext) {
                    if (!targetNext) {
                        // 在注释前插入值
                        ctn.insertBefore(vm.$el, this.ref)
                    } else {
                        nextEl = targetNext.$el
                        // new VMs' element might not be in the DOM yet
                        // due to transitions
                        while (!nextEl.parentNode) {
                            targetNext = vms[nextEl.vue_vm.$index + 1]
                            nextEl = targetNext
                                ? targetNext.$el
                                : this.ref
                        }
                        ctn.insertBefore(vm.$el, nextEl)
                    }
                }
                // 删除之前的标记
                delete vm.$reused
                delete item.$index
                delete item.$key
            } else { // a new vm
                // 如果是 新建的 vm实例, 直接在最后处插入该dom
                vm.$before(targetNext ? targetNext.$el : this.ref)
            }
        }

        return vms
    },
    /**
     * {object} data 数据;
     * {number} index 序号
     * {boolean} isObject 是否为对象. 确定值的处理方式.
     */
    build: function (data, index, isObject) {
        // wrap non-object values
        var raw, alias,
            wrap = !isObject || this.arg
        // 非对象
        if (wrap) {
            raw = data
            // 切割. 如果 v-repeat = 'item: items'
            // 则参数为 item. 否则默认为 $value
            alias = this.arg || '$value'
            // 默认传入 $index 为序号.
            data = { $index: index }
            // 传值
            data[alias] = raw
        }
        // 创建组件
        var el = this.el.cloneNode(true),
            Ctor = this.compiler.resolveComponent(el, data),
            vm = new Ctor({
                el: el,
                data: data,
                parent: this.vm,
                compilerOptions: {
                    repeat: true
                }
            })

        // attach an ienumerable identifier
        // 属性保护. 传入data 与 $index
        utils.defProtected(data, this.identifier, true)
        vm.$index = index

        if (wrap) {
            var self = this,
                sync = function (val) {
                    self.lock = true
                    // 锁定. 防止更新频繁
                    self.collection.$set(vm.$index, val)
                    self.lock = false
                }
            // 监听 更新.
            vm.$compiler.observer.on('change:' + alias, sync)
        }

        return vm

    },
    // 摧毁 全部的repeat 子组件
    unbind: function () {
        if (this.childId) {
            delete this.vm.$[this.childId]
        }
        if (this.vms) {
            var i = this.vms.length
            while (i--) {
                this.vms[i].$destroy()
            }
        }
    }
}

// Helpers --------------------------------------------------------------------

/**
 *  Find an object or a wrapped data object
 *  from an Array
 * 从一个 vm的集合里 查找 某个 vm实例. 返回序号
 */
function indexOf (vms, obj) {
    for (var vm, i = 0, l = vms.length; i < l; i++) {
        vm = vms[i]
        if (!vm.$reused && vm.$value === obj) {
            return i
        }
    }
    return -1
}

/***/ }),
/* 19 */
/***/ (function(module, exports) {

/**
 * 样式
 * 这个 v-style 与 以后的 :style 用法不一样.
 * v-style = 'font-size: "12px"'
 */
var camelRE = /-([a-z])/g,
    prefixes = ['webkit', 'moz', 'ms']

function camelReplacer (m) {
    return m[1].toUpperCase()
}

module.exports = {

    bind: function () {
        // prop 为 样式名称
        var prop = this.arg
        if (!prop) return
        var first = prop.charAt(0)
        if (first === '$') {
            // properties that start with $ will be auto-prefixed
            // 前面有 $标记的时. 需要自动添加前缀
            prop = prop.slice(1)
            this.prefixed = true
        } else if (first === '-') {
            // normal starting hyphens should not be converted
            prop = prop.slice(1)
        }
        // 将 带有 - 的属性名 转为 驼峰
        this.prop = prop.replace(camelRE, camelReplacer)
        
    },

    update: function (value) {
        // 更新 判断键值
        var prop = this.prop
        if (prop) {
            // 更新对应的值
            this.el.style[prop] = value
            // 添加浏览器前缀
            if (this.prefixed) {
                prop = prop.charAt(0).toUpperCase() + prop.slice(1)
                var i = prefixes.length
                while (i--) {
                    // 添加各个前缀符
                    this.el.style[prefixes[i] + prop] = value
                }
            }
        } else {
            // 直接更新 style上的值
            this.el.style.cssText = value
        }
    }

}

/***/ }),
/* 20 */
/***/ (function(module, exports) {

/**
 * v-view 子组件
 */
module.exports = {

    bind: function () {

        // track position in DOM with a ref node
        var el       = this.raw = this.el,
            parent   = el.parentNode,
            // 通过 注释 v-view 跟踪
            ref      = this.ref = document.createComment('v-view')
        parent.insertBefore(ref, el)
        parent.removeChild(el)

        // cache original content
        /* jshint boss: true */
        var node,
            frag = this.inner = document.createDocumentFragment()
        while (node = el.firstChild) {
            frag.appendChild(node)
        }

    },

    update: function(value) {

        this._unbind()
        // 
        var Ctor  = this.compiler.getOption('components', value)
        if (!Ctor) return

        var inner = this.inner.cloneNode(true)
        // 创建一个新的组件
        this.childVM = new Ctor({
            el: this.raw.cloneNode(true),
            parent: this.vm,
            created: function () {
                this.$compiler.rawContent = inner
            }
        })

        this.el = this.childVM.$el
        // 更新完成后插入 这里应该是直接更新整个组件
        if (this.compiler.init) {
            this.ref.parentNode.insertBefore(this.el, this.ref)
        } else {
            this.childVM.$before(this.ref)
        }

    },
    // 摧毁子组件
    unbind: function() {
        if (this.childVM) {
            this.childVM.$destroy()
        }
    }

}

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * v-with. 组件传值
 */
var utils = __webpack_require__(0)

module.exports = {

    bind: function () {

        var self      = this,
            // 监听值
            childKey  = self.arg,
            // 父值
            parentKey = self.key,
            compiler  = self.compiler,
            owner     = self.binding.compiler

        if (compiler === owner) {
            // TODO: 未知.
            this.alone = true
            return
        }

        if (childKey) {
            // 检查当前编译器上是否有监听值.
            if (!compiler.bindings[childKey]) {
                compiler.createBinding(childKey)
            }
            // sync changes on child back to parent
            // 监听. 父组件值更新时, 触发子组件更新
            compiler.observer.on('change:' + childKey, function (val) {
                if (compiler.init) return
                if (!self.lock) {
                    // 锁定 更新
                    self.lock = true
                    utils.nextTick(function () {
                        self.lock = false
                    })
                }
                owner.vm.$set(parentKey, val)
            })
        }
    },

    update: function (value) {
        // sync from parent
        // 更新
        if (!this.alone && !this.lock) {
            if (this.arg) {
                this.vm.$set(this.arg, value)
            } else {
                this.vm.$data = value
            }
        }
    }

}

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * 解析表达式
 * 该文件暴露出两个方法.
 * parse, 以及 eval
 * parse 将一个表达式字符串转为一个匿名方法.
 * 提取出字符串中的变量名(getVariables)
 * 解析出一串字符串. 而后转为匿名方法(makeGetter).
 * 该匿名方法 可通过改变上下文执行, 返回 赋值后的表达式
 * 
 * eval 则是将表达式转为 字符串
 */
var utils           = __webpack_require__(0),
    STR_SAVE_RE     = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
    STR_RESTORE_RE  = /"(\d+)"/g,
    NEWLINE_RE      = /\n/g,
    CTOR_RE         = new RegExp('constructor'.split('').join('[\'"+, ]*')),
    UNICODE_RE      = /\\u\d\d\d\d/,
    QUOTE_RE        = /"/g

// Variable extraction scooped from https://github.com/RubyLouvre/avalon

var KEYWORDS =
        // keywords
        'break,case,catch,continue,debugger,default,delete,do,else,false' +
        ',finally,for,function,if,in,instanceof,new,null,return,switch,this' +
        ',throw,true,try,typeof,var,void,while,with,undefined' +
        // reserved
        ',abstract,boolean,byte,char,class,const,double,enum,export,extends' +
        ',final,float,goto,implements,import,int,interface,long,native' +
        ',package,private,protected,public,short,static,super,synchronized' +
        ',throws,transient,volatile' +
        // ECMA 5 - use strict
        ',arguments,let,yield' +
        // allow using Math in expressions
        ',Math',
        
    KEYWORDS_RE = new RegExp(["\\b" + KEYWORDS.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g'),
    REMOVE_RE   = /\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|'[^']*'|"[^"]*"|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g,
    SPLIT_RE    = /[^\w$]+/g,
    NUMBER_RE   = /\b\d[^,]*/g,
    BOUNDARY_RE = /^,+|,+$/g

/**
 *  Strip top level variable names from a snippet of JS expression
 * 从JS中剥离 变量名.
 */
function getVariables (code) {
    code = code
        .replace(REMOVE_RE, '')
        .replace(SPLIT_RE, ',')
        .replace(KEYWORDS_RE, '')
        .replace(NUMBER_RE, '')
        .replace(BOUNDARY_RE, '')
    return code
        ? code.split(/,+/)
        : []
}

/**
 *  A given path could potentially exist not on the
 *  current compiler, but up in the parent chain somewhere.
 *  This function generates an access relationship string
 *  that can be used in the getter function by walking up
 *  the parent chain to check for key existence.
 *
 *  It stops at top parent if no vm in the chain has the
 *  key. It then creates any missing bindings on the
 *  final resolved vm.
 * 当给定的路径在当前编译器上不存在, 且 父类上存在时,
 * 生成一个关键字符串. 来获取该值
 */
function traceScope (path, compiler, data) {
    var rel  = '',
        dist = 0,
        self = compiler

    if (data && utils.get(data, path) !== undefined) {
        // hack: temporarily attached data
        return '$temp.'
    }

    while (compiler) {
        if (compiler.hasKey(path)) {
            break
        } else {
            compiler = compiler.parent
            dist++
        }
    }
    if (compiler) {
        while (dist--) {
            rel += '$parent.'
        }
        if (!compiler.bindings[path] && path.charAt(0) !== '$') {
            compiler.createBinding(path)
        }
    } else {
        self.createBinding(path)
    }
    return rel
}

/**
 *  Create a function from a string...
 *  this looks like evil magic but since all variables are limited
 *  to the VM's data it's actually properly sandboxed
 * 从一个字符串创建一个方法.
 * 返回一个方法. 执行该方法则可以获得值
 */
function makeGetter (exp, raw) {
    var fn
    try {
        fn = new Function(exp)
    } catch (e) {
        utils.warn('Error parsing expression: ' + raw)
    }
    return fn
}

/**
 *  Escape a leading dollar sign for regex construction
 * 将 $ 转码
 */
function escapeDollar (v) {
    return v.charAt(0) === '$'
        ? '\\' + v
        : v
}

/**
 *  Convert double quotes to single quotes
 *  so they don't mess up the generated function body
 * 将顺引号转为单引号
 */
function escapeQuote (v) {
    return v.indexOf('"') > -1
        ? v.replace(QUOTE_RE, '\'')
        : v
}

/**
 *  Parse and return an anonymous computed property getter function
 *  from an arbitrary expression, together with a list of paths to be
 *  created as bindings.
 * 解析 且返回一个匿名方法.
 * 
 * @param {string} exp 表达式
 * @param {Compiler} compiler 编译器
 * @param {object} data 数值
 * @param {filters} filters 过滤器
 */
exports.parse = function (exp, compiler, data, filters) {
    // unicode and 'constructor' are not allowed for XSS security.
    if (UNICODE_RE.test(exp) || CTOR_RE.test(exp)) {
        utils.warn('Unsafe expression: ' + exp)
        return
    }
    // extract variable names
    var vars = getVariables(exp)
    if (!vars.length) {
        return makeGetter('return ' + exp, exp)
    }
    vars = utils.unique(vars)

    var accessors = '',
        has       = utils.hash(),
        strings   = [],
        // construct a regex to extract all valid variable paths
        // ones that begin with "$" are particularly tricky
        // because we can't use \b for them
        pathRE = new RegExp(
            "[^$\\w\\.](" +
            vars.map(escapeDollar).join('|') +
            ")[$\\w\\.]*\\b", 'g'
        ),
        body = (' ' + exp)
            .replace(STR_SAVE_RE, saveStrings)
            .replace(pathRE, replacePath)
            .replace(STR_RESTORE_RE, restoreStrings)

    // wrap expression with computed filters
    // 有过滤器的话则需要包装下过滤器
    if (filters) {
        filters.forEach(function (filter) {
            var args = filter.args
                ? ',"' + filter.args.map(escapeQuote).join('","') + '"'
                : ''
            body =
                'this.$compiler.getOption("filters", "' +
                    filter.name +
                '").call(this,' +
                    body + args +
                ')'
        })
    }

    body = accessors + 'return ' + body
    /**
     * 将表达式的字符串和变量先保存到数组里.
     * @param {*} str 
     */
    function saveStrings (str) {
        var i = strings.length
        // escape newlines in strings so the expression
        // can be correctly evaluated
        strings[i] = str.replace(NEWLINE_RE, '\\n')
        return '"' + i + '"'
    }
    /**
     * 替换变量路径.
     * @param {string} path 变量路径
     */
    function replacePath (path) {
        // keep track of the first char
        var c = path.charAt(0)
        path = path.slice(1)
        var val = 'this.' + traceScope(path, compiler, data) + path
        if (!has[path]) {
            accessors += val + ';'
            has[path] = 1
        }
        // don't forget to put that first char back
        return c + val
    }
    /**
     * 将表达式的 字符串里的占位符 转为 正常的变量值.
     * @param {*} str 
     * @param {*} i 
     */
    function restoreStrings (str, i) {
        return strings[i]
    }

    return makeGetter(body, exp)
}

/**
 *  Evaluate an expression in the context of a compiler.
 *  Accepts additional data.
 * 将 匿名方法执行后, 返回一个字符串.
 */
exports.eval = function (exp, compiler, data) {
    // 先得到一个 匿名方法
    var getter = exports.parse(exp, compiler, data), res
    if (getter) {
        // hack: temporarily attach the additional data so
        // it can be accessed in the getter
        // 利用call 改变上下文. 保证该匿名方法能获取到表达式的值.
        compiler.vm.$temp = data
        res = getter.call(compiler.vm)
        delete compiler.vm.$temp
    }
    return res
}

/***/ })
/******/ ]);