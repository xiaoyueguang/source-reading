/**
 * 这个文件本质上就是扩展了 lang 这个助手函数.
 */
var lang = require('./lang')
var extend = lang.extend
extend(exports, lang)
// 部分环境
extend(exports, require('./env'))
// 操作 dom 相关
extend(exports, require('./dom'))
// 处理 父组件和 自组件的 合并事项
extend(exports, require('./options'))
// 组件初始化相关
extend(exports, require('./component'))
// 调试相关
extend(exports, require('./debug'))
