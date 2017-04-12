/**
 * 编译器
 */
var Emitter     = require('./emitter'),
    Observer    = require('./observer'),
    config      = require('./config'),
    utils       = require('./utils'),
    Binding     = require('./binding'),
    Directive   = require('./directive'),
    TextParser  = require('./text-parser'),
    DepsParser  = require('./deps-parser'),
    ExpParser   = require('./exp-parser'),
    ViewModel,
    
    // cache methods
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
    // TODO: compilerOptions
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
    // TODO:
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
    var computed = options.computed
    if (computed) {
        for (var key in computed) {
            compiler.createBinding(key)
        }
    }

    // copy paramAttributes
    if (options.paramAttributes) {
        options.paramAttributes.forEach(function (attr) {
            var val = compiler.eval(el.getAttribute(attr))
            vm[attr] = utils.checkNumber(val)
        })
    }

    // beforeCompile hook
    compiler.execHook('created')

    // the user might have set some props on the vm 
    // so copy it back to the data...
    extend(data, vm)

    // observe the data
    compiler.observeData(data)
    
    // for repeated items, create index/key bindings
    // because they are ienumerable
    if (compiler.repeat) {
        compiler.createBinding('$index')
        if (data.$key) {
            compiler.createBinding('$key')
        }
    }

    // now parse the DOM, during which we will create necessary bindings
    // and bind the parsed directives
    compiler.compile(el, true)

    // bind deferred directives (child components)
    compiler.deferred.forEach(function (dir) {
        compiler.bindDirective(dir)
    })

    // extract dependencies for computed properties
    compiler.parseDeps()

    // done!
    compiler.rawContent = null
    compiler.init = false

    // post compile / ready hook
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
        console.log(options.replace)
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

CompilerProto.observeData = function (data) {

    var compiler = this,
        observer = compiler.observer

    // recursively observe nested properties
    Observer.observe(data, '', observer)

    // also create binding for top level $data
    // so it can be used in templates too
    var $dataBinding = compiler.bindings['$data'] = new Binding(compiler, '$data')
    $dataBinding.update(data)

    // allow $data to be swapped
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
 */
CompilerProto.compile = function (node, root) {
    var nodeType = node.nodeType
    if (nodeType === 1 && node.tagName !== 'SCRIPT') { // a normal node
        this.compileElement(node, root)
    } else if (nodeType === 3 && config.interpolate) {
        this.compileTextNode(node)
    }
}

/**
 *  Check for a priority directive
 *  If it is present and valid, return true to skip the rest
 */
CompilerProto.checkPriorityDir = function (dirname, node, root) {
    var expression, directive, Ctor
    if (dirname === 'component' && root !== true && (Ctor = this.resolveComponent(node, undefined, true))) {
        directive = Directive.parse(dirname, '', this, node)
        directive.Ctor = Ctor
    } else {
        expression = utils.attr(node, dirname)
        directive = expression && Directive.parse(dirname, expression, this, node)
    }
    if (directive) {
        if (root === true) {
            utils.warn('Directive v-' + dirname + ' cannot be used on manually instantiated root node.')
            return
        }
        this.deferred.push(directive)
        return true
    }
}

/**
 *  Compile normal directives on a node
 */
CompilerProto.compileElement = function (node, root) {

    // textarea is pretty annoying
    // because its value creates childNodes which
    // we don't want to compile.
    if (node.tagName === 'TEXTAREA' && node.value) {
        node.value = this.eval(node.value)
    }

    // only compile if this element has attributes
    // or its tagName contains a hyphen (which means it could
    // potentially be a custom element)
    if (node.hasAttributes() || node.tagName.indexOf('-') > -1) {

        // skip anything with v-pre
        if (utils.attr(node, 'pre') !== null) {
            return
        }

        // check priority directives.
        // if any of them are present, it will take over the node with a childVM
        // so we can skip the rest
        for (var i = 0, l = priorityDirectives.length; i < l; i++) {
            if (this.checkPriorityDir(priorityDirectives[i], node, root)) {
                return
            }
        }

        // check transition & animation properties
        // 检查动画或过渡属性
        node.vue_trans  = utils.attr(node, 'transition')
        node.vue_anim   = utils.attr(node, 'animation')
        node.vue_effect = this.eval(utils.attr(node, 'effect'))

        var prefix = config.prefix + '-',
            attrs = slice.call(node.attributes),
            params = this.options.paramAttributes,
            attr, isDirective, exps, exp, directive, dirname

        i = attrs.length
        while (i--) {

            attr = attrs[i]
            isDirective = false

            if (attr.name.indexOf(prefix) === 0) {
                // a directive - split, parse and bind it.
                isDirective = true
                exps = Directive.split(attr.value)
                // loop through clauses (separated by ",")
                // inside each attribute
                l = exps.length
                while (l--) {
                    exp = exps[l]
                    dirname = attr.name.slice(prefix.length)
                    directive = Directive.parse(dirname, exp, this, node)

                    if (dirname === 'with') {
                        this.bindDirective(directive, this.parent)
                    } else {
                        this.bindDirective(directive)
                    }
                    
                }
            } else if (config.interpolate) {
                // non directive attribute, check interpolation tags
                exp = TextParser.parseAttr(attr.value)
                if (exp) {
                    directive = Directive.parse('attr', attr.name + ':' + exp, this, node)
                    if (params && params.indexOf(attr.name) > -1) {
                        // a param attribute... we should use the parent binding
                        // to avoid circular updates like size={{size}}
                        this.bindDirective(directive, this.parent)
                    } else {
                        this.bindDirective(directive)
                    }
                }
            }

            if (isDirective && dirname !== 'cloak') {
                node.removeAttribute(attr.name)
            }
        }

    }

    // recursively compile childNodes
    if (node.hasChildNodes()) {
        slice.call(node.childNodes).forEach(this.compile, this)
    }
}

/**
 *  Compile a text node
 */
CompilerProto.compileTextNode = function (node) {

    var tokens = TextParser.parse(node.nodeValue)
    if (!tokens) return
    var el, token, directive

    for (var i = 0, l = tokens.length; i < l; i++) {

        token = tokens[i]
        directive = null

        if (token.key) { // a binding
            if (token.key.charAt(0) === '>') { // a partial
                el = document.createComment('ref')
                directive = Directive.parse('partial', token.key.slice(1), this, el)
            } else {
                if (!token.html) { // text binding
                    el = document.createTextNode('')
                    directive = Directive.parse('text', token.key, this, el)
                } else { // html binding
                    el = document.createComment(config.prefix + '-html')
                    directive = Directive.parse('html', token.key, this, el)
                }
            }
        } else { // a plain string
            el = document.createTextNode(token)
        }

        // insert node
        node.parentNode.insertBefore(el, node)
        // bind directive
        this.bindDirective(directive)

    }
    node.parentNode.removeChild(node)
}

/**
 *  Add a directive instance to the correct binding & viewmodel
 */
CompilerProto.bindDirective = function (directive, bindingOwner) {

    if (!directive) return

    // keep track of it so we can unbind() later
    this.dirs.push(directive)

    // for empty or literal directives, simply call its bind()
    // and we're done.
    if (directive.isEmpty || directive.isLiteral) {
        if (directive.bind) directive.bind()
        return
    }

    // otherwise, we got more work to do...
    var binding,
        compiler = bindingOwner || this,
        key      = directive.key

    if (directive.isExp) {
        // expression bindings are always created on current compiler
        binding = compiler.createBinding(key, directive)
    } else {
        // recursively locate which compiler owns the binding
        while (compiler) {
            if (compiler.hasKey(key)) {
                break
            } else {
                compiler = compiler.parent
            }
        }
        compiler = compiler || this
        binding = compiler.bindings[key] || compiler.createBinding(key)
    }
    binding.dirs.push(directive)
    directive.binding = binding

    var value = binding.val()
    // invoke bind hook if exists
    if (directive.bind) {
        directive.bind(value)
    }
    // set initial value
    directive.update(value, true)
}

/**
 *  Create binding and attach getter/setter for a key to the viewmodel object
 * 为 vm 创建绑定一个 getter/setter
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
                // 普通属性. 非私有属性
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
 */
CompilerProto.defineProp = function (key, binding) {
    
    var compiler = this,
        data     = compiler.data,
        ob       = data.__emitter__

    // make sure the key is present in data
    // so it can be observed
    if (!(hasOwn.call(data, key))) {
        data[key] = undefined
    }

    // if the data object is already observed, but the key
    // is not observed, we need to add it to the observed keys.
    if (ob && !(hasOwn.call(ob.values, key))) {
        Observer.convertKey(data, key)
    }

    binding.value = data[key]

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
        
    }
    return result
}

/**
 *  Emit lifecycle events to trigger hooks
 */
CompilerProto.execHook = function (event) {
    event = 'hook:' + event
    this.observer.emit(event)
    this.emitter.emit(event)
}

/**
 *  Check if a compiler's data contains a keypath
 */
CompilerProto.hasKey = function (key) {
    var baseKey = utils.baseKey(key)
    return hasOwn.call(this.data, baseKey) ||
        hasOwn.call(this.vm, baseKey)
}

/**
 *  Collect dependencies for computed properties
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
 */
CompilerProto.resolveComponent = function (node, data, test) {

    // late require to avoid circular deps
    ViewModel = ViewModel || require('./viewmodel')

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
 */
CompilerProto.destroy = function () {

    // avoid being called more than once
    // this is irreversible!
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

    compiler.execHook('beforeDestroy')

    // unobserve data
    Observer.unobserve(compiler.data, '', compiler.observer)

    // unbind all direcitves
    i = directives.length
    while (i--) {
        dir = directives[i]
        // if this directive is an instance of an external binding
        // e.g. a directive that refers to a variable on the parent VM
        // we need to remove it from that binding's directives
        // * empty and literal bindings do not have binding.
        if (dir.binding && dir.binding.compiler !== compiler) {
            dirs = dir.binding.dirs
            if (dirs) dirs.splice(dirs.indexOf(dir), 1)
        }
        dir.unbind()
    }

    // unbind all computed, anonymous bindings
    i = computed.length
    while (i--) {
        computed[i].unbind()
    }

    // unbind all keypath bindings
    for (key in bindings) {
        binding = bindings[key]
        if (binding) {
            binding.unbind()
        }
    }

    // remove all event delegators
    for (key in delegators) {
        el.removeEventListener(key, delegators[key].handler)
    }

    // destroy all children
    i = children.length
    while (i--) {
        children[i].destroy()
    }

    // remove self from parent
    if (parent) {
        parent.children.splice(parent.children.indexOf(compiler), 1)
    }

    // finally remove dom element
    if (el === document.body) {
        el.innerHTML = ''
    } else {
        vm.$remove()
    }
    el.vue_vm = null

    compiler.destroyed = true
    // emit destroy hook
    compiler.execHook('afterDestroy')

    // finally, unregister all listeners
    compiler.observer.off()
    compiler.emitter.off()
}

// Helpers --------------------------------------------------------------------

/**
 *  shorthand for getting root compiler
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