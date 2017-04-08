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
    config     = require('./config'),
    // batch enter animations so we only force the layout once
    Batcher    = require('./batcher'),
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