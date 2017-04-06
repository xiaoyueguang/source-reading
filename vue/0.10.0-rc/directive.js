/**
 * Vue 指令系统
 * Vue 的指令 是指 带有 v- 前缀的语法.
 * 比如 v-if v-show 等
 */
var utils      = require('./utils'),
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
 */
/**
 * 
 * @param {string} dirname 指令名称
 * @param {object} definition 指令的定义. 可查看 directives里的内容
 * @param {string} expression 指令的表达式.
 *                              即 v-text = 'aaa + 1'
 *                              aaa + 1 即表达式
 * @param {string} rawKey TODO:总是与上面的一致. 还不知道叫什么好
 * @param {object|compiler} compiler 编译器
 * @param {node} node 节点的引用.
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
    // 
    this.computeFilters = false
    // 表达式是否为空
    var isEmpty   = expression === ''

    // mix in properties from the directive definition
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
    if (isEmpty || this.isEmpty) {
        this.isEmpty = true
        return
    }

    this.expression = (
        this.isLiteral
            ? compiler.eval(expression)
            : expression
    ).trim()
    
    parseKey(this, rawKey)
    
    var filterExps = this.expression.slice(rawKey.length).match(FILTERS_RE)
    if (filterExps) {
        this.filters = []
        for (var i = 0, l = filterExps.length, filter; i < l; i++) {
            filter = parseFilter(filterExps[i], this.compiler)
            if (filter) {
                this.filters.push(filter)
                if (filter.apply.computed) {
                    // some special filters, e.g. filterBy & orderBy,
                    // can involve VM properties and they often need to
                    // be computed.
                    this.computeFilters = true
                }
            }
        }
        if (!this.filters.length) this.filters = null
    } else {
        this.filters = null
    }

    this.isExp =
        this.computeFilters ||
        !SINGLE_VAR_RE.test(this.key) ||
        NESTING_RE.test(this.key)

}

var DirProto = Directive.prototype

/**
 *  parse a key, extract argument and nesting/root info
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
 */
function parseFilter (filter, compiler) {

    var tokens = filter.slice(1).match(FILTER_TOKEN_RE)
    if (!tokens) return

    var name = tokens[0],
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
 */
DirProto.update = function (value, init) {
    var type = utils.typeOf(value)
    if (init || value !== this.value || type === 'Object' || type === 'Array') {
        this.value = value
        if (this._update) {
            this._update(
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
 */
DirProto.applyFilters = function (value) {
    var filtered = value, filter
    for (var i = 0, l = this.filters.length; i < l; i++) {
        filter = this.filters[i]
        filtered = filter.apply.apply(this.vm, [filtered].concat(filter.args))
    }
    return filtered
}

/**
 *  Unbind diretive
 */
DirProto.unbind = function () {
    // this can be called before the el is even assigned...
    if (!this.el || !this.vm) return
    if (this._unbind) this._unbind()
    this.vm = this.el = this.binding = this.compiler = null
}

// exposed methods ------------------------------------------------------------

/**
 *  split a unquoted-comma separated expression into
 *  multiple clauses
 */
Directive.split = function (exp) {
    return exp.indexOf(',') > -1
        ? exp.match(SPLIT_RE) || ['']
        : [exp]
}

/**
 *  make sure the directive and expression is valid
 *  before we create an instance
 */
Directive.parse = function (dirname, expression, compiler, node) {

    var dir = compiler.getOption('directives', dirname) || directives[dirname]
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
    if (rawKey || expression === '') {
        return new Directive(dirname, dir, expression, rawKey, compiler, node)
    } else {
        utils.warn('invalid directive expression: ' + expression)
    }
}

module.exports = Directive