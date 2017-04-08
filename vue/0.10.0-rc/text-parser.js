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