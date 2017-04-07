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
var utils      = require('../utils'),
    config     = require('../config'),
    transition = require('../transition')

module.exports = {

    on        : require('./on'),
    repeat    : require('./repeat'),
    model     : require('./model'),
    'if'      : require('./if'),
    'with'    : require('./with'),
    html      : require('./html'),
    style     : require('./style'),
    partial   : require('./partial'),
    view      : require('./view'),

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
        bind: function () {
            var params = this.vm.$options.paramAttributes
            this.isParam = params && params.indexOf(this.arg) > -1
        },
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
        var el = this.el,
            target = value ? '' : 'none',
            change = function () {
                el.style.display = target
            }
        transition(el, value ? 1 : -1, change, this.compiler)
    },

    'class': function (value) {
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