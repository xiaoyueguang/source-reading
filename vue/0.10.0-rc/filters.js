/**
 * 过滤
 */
var utils    = require('./utils'),
    get      = utils.get,
    slice    = [].slice,
    QUOTE_RE = /^'.*'$/
/**
 * 键盘别名
 */
var keyCodes = {
    enter    : 13,
    tab      : 9,
    'delete' : 46,
    up       : 38,
    left     : 37,
    right    : 39,
    down     : 40,
    esc      : 27
}
/**
 * Vue自带的过滤器
 */
var filters = module.exports = {

    /**
     *  'abc' => 'Abc'
     * 驼峰
     */
    capitalize: function (value) {
        if (!value && value !== 0) return ''
        value = value.toString()
        return value.charAt(0).toUpperCase() + value.slice(1)
    },

    /**
     *  'abc' => 'ABC'
     * 小写转大写
     */
    uppercase: function (value) {
        return (value || value === 0)
            ? value.toString().toUpperCase()
            : ''
    },

    /**
     *  'AbC' => 'abc'
     * 大写转小写
     */
    lowercase: function (value) {
        return (value || value === 0)
            ? value.toString().toLowerCase()
            : ''
    },

    /**
     *  12345 => $12,345.00
     * 字符转货币
     */
    currency: function (value, sign) {
        if (!value && value !== 0) return ''
        sign = sign || '$'
        var s = Math.floor(value).toString(),
            i = s.length % 3,
            h = i > 0 ? (s.slice(0, i) + (s.length > 3 ? ',' : '')) : '',
            f = '.' + value.toFixed(2).slice(-2)
        return sign + h + s.slice(i).replace(/(\d{3})(?=\d)/g, '$1,') + f
    },

    /**
     *  args: an array of strings corresponding to
     *  the single, double, triple ... forms of the word to
     *  be pluralized. When the number to be pluralized
     *  exceeds the length of the args, it will use the last
     *  entry in the array.
     *
     *  e.g. ['single', 'double', 'triple', 'multiple']
     * 复数形式. 接受值 和 复数单位参数.
     * 自动在后面跟上 复数单位.
     * TODO: 没怎么用过
     */
    pluralize: function (value) {
        var args = slice.call(arguments, 1)
        return args.length > 1
            ? (args[value - 1] || args[args.length - 1])
            : (args[value - 1] || args[0] + 's')
    },

    /**
     *  A special filter that takes a handler function,
     *  wraps it so it only gets triggered on specific keypresses.
     * 设置按键. 包装传入的回调, 判断触发的keyCode, 触发回调
     */
    key: function (handler, key) {
        if (!handler) return
        var code = keyCodes[key]
        if (!code) {
            code = parseInt(key, 10)
        }
        return function (e) {
            if (e.keyCode === code) {
                handler.call(this, e)
            }
        }
    },
    /**
     * 数组过滤
     */
    filterBy: function (arr, searchKey, delimiter, dataKey) {

        // allow optional `in` delimiter
        // because why not
        // v-for = "item in items" `in`即分隔符
        if (delimiter && delimiter !== 'in') {
            dataKey = delimiter
        }

        // get the search string
        var search = stripQuotes(searchKey) || get(this, searchKey)
        if (!search) return arr
        search = search.toLowerCase()

        // get the optional dataKey
        dataKey = dataKey && (stripQuotes(dataKey) || get(this, dataKey))

        // convert object to array
        // 对象转为数组后, 调用数组的 过滤方法
        if (!Array.isArray(arr)) {
            arr = utils.objectToArray(arr)
        }

        return arr.filter(function (item) {
            return dataKey
                ? contains(get(item, dataKey), search)
                : contains(item, search)
        })

    },
    /**
     * 数组排序
     */
    orderBy: function (arr, sortKey, reverseKey) {

        var key = stripQuotes(sortKey) || get(this, sortKey)
        if (!key) return arr

        // convert object to array
        // 对象转为数组
        if (!Array.isArray(arr)) {
            arr = utils.objectToArray(arr)
        }

        var order = 1
        // 获取排序关键字
        if (reverseKey) {
            if (reverseKey === '-1') {
                order = -1
            } else if (reverseKey.charAt(0) === '!') {
                reverseKey = reverseKey.slice(1)
                order = get(this, reverseKey) ? 1 : -1
            } else {
                order = get(this, reverseKey) ? -1 : 1
            }
        }

        // sort on a copy to avoid mutating original array
        /**
         * 利用 slice() 来快速创建一个新的数组. 然后利用数组的排序来进行排序
         * 与原先的数组不冲突
         */
        return arr.slice().sort(function (a, b) {
            a = get(a, key)
            b = get(b, key)
            return a === b ? 0 : a > b ? order : -order
        })

    }

}

// Array filter helpers -------------------------------------------------------
// 数组过滤助手方法
/**
 *  String contain helper
 * 判断是否包含字符串
 */
function contains (val, search) {
    /* jshint eqeqeq: false */
    if (utils.typeOf(val) === 'Object') {
        for (var key in val) {
            if (contains(val[key], search)) {
                return true
            }
        }
    } else if (val != null) {
        return val.toString().toLowerCase().indexOf(search) > -1
    }
}

/**
 *  Test whether a string is in quotes,
 *  if yes return stripped string
 * 去除引号.
 * 判断字符串是否两边包含引号. 若有, 则去除引号.
 */
function stripQuotes (str) {
    if (QUOTE_RE.test(str)) {
        return str.slice(1, -1)
    }
}

// mark computed filters
// TODO: 标记可计算?
filters.filterBy.computed = true
filters.orderBy.computed = true