/**
 * 解析 依赖.
 */

var Emitter  = require('./emitter'),
    utils    = require('./utils'),
    Observer = require('./observer'),
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
    // 触发编译器上的观察者
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