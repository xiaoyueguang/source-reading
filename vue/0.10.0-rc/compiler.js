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
    console.log(exp, data)
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