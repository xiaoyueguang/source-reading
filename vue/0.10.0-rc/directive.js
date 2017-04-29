/**
 * Vue 指令系统
 * Vue 的指令 是指 带有 v- 前缀的语法.
 * 比如 v-if v-show 等
 * 将dom上的指令以及表达式, 生成一条新的指令.
 * 而后通过指令的 update, 该指令所指的 dom的值改变.
 * 也因指令操作的为 dom节点, 而非组件.
 * 从而达到最小程度更新DOM.
 */
var utils      = require('./utils'),
    /**
     * 该值里包含了各种各样的指令.
     * 每个指令 可为方法. 或对象.
     */
    directives = require('./directives'),
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
    // 是否计算过滤器
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