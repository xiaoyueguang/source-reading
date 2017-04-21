/**
 * Vue 的双向绑定
 */
var utils = require('../utils'),
    isIE9 = navigator.userAgent.indexOf('MSIE 9.0') > 0,
    filter = [].filter

/**
 *  Returns an array of values from a multiple select
 * 从一个 select 元素里. 取出被选中的值
 */
function getMultipleSelectOptions (select) {
    return filter
        .call(select.options, function (option) {
            return option.selected
        })
        .map(function (option) {
            return option.value || option.text
        })
}

module.exports = {

    bind: function () {

        var self = this,
            el   = self.el,
            // input 标签类型
            type = el.type,
            // input 标签名称
            tag  = el.tagName

        self.lock = false
        self.ownerVM = self.binding.compiler.vm

        // determine what event to listen to
        // 确定监听的事件.
        // 如果选项开启 lazy, 或者 checkbox radio select. 均采用 change 事件.
        // 否者 默认监听 input 事件
        self.event =
            (self.compiler.options.lazy ||
            tag === 'SELECT' ||
            type === 'checkbox' || type === 'radio')
                ? 'change'
                : 'input'

        // determine the attribute to change when updating
        // 确定值的更新方式.
        // checkbox 更新为 调整 节点的checked.
        // input select 以及 textarea 为 更新 节点的 value
        // 默认调整 innerHTML
        self.attr = type === 'checkbox'
            ? 'checked'
            : (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
                ? 'value'
                : 'innerHTML'

        // select[multiple] support
        // 支持多选
        if(tag === 'SELECT' && el.hasAttribute('multiple')) {
            this.multi = true
        }
        // 锁. 为中文输入做优化
        var compositionLock = false
        // 锁定
        self.cLock = function () {
            compositionLock = true
        }
        // 解锁
        self.cUnlock = function () {
            compositionLock = false
        }
        // 注册事件
        /**
         * compositionstart compositionend compositionupdate
         * 专门为中文输入做优化.
         * 当开始输入的时候, 出现选词框的时, 会触发 start.
         * 输入时候会触发 update
         * 输入完成后 触发 end.
         */
        el.addEventListener('compositionstart', this.cLock)
        el.addEventListener('compositionend', this.cUnlock)

        // attach listener
        self.set = self.filters
            ? function () {
                // 中文输入时 禁止
                if (compositionLock) return
                // if this directive has filters
                // we need to let the vm.$set trigger
                // update() so filters are applied.
                // therefore we have to record cursor position
                // so that after vm.$set changes the input
                // value we can put the cursor back at where it is
                // 如果 指令有过滤器
                var cursorPos
                try { cursorPos = el.selectionStart } catch (e) {}

                self._set()

                // since updates are async
                // we need to reset cursor position async too
                utils.nextTick(function () {
                    if (cursorPos !== undefined) {
                        // 当dom更新完之后, 自动定位光标.
                        el.setSelectionRange(cursorPos, cursorPos)
                    }
                })
            }
            : function () {
                if (compositionLock) return
                // no filters, don't let it trigger update()
                // 没有过滤器的情况. 锁定.
                self.lock = true

                self._set()

                utils.nextTick(function () {
                    self.lock = false
                })
            }
        // 监听 事件. 以及 触发更新(这一步即实现了双向绑定)
        el.addEventListener(self.event, self.set)

        // fix shit for IE9
        // since it doesn't fire input on backspace / del / cut
        // IE9 监听事件 不支持 backspace / del / cut 事件. 这一步做修正.
        // 监听了 cut 以及 keyup 事件
        if (isIE9) {
            self.onCut = function () {
                // cut event fires before the value actually changes
                utils.nextTick(function () {
                    self.set()
                })
            }
            self.onDel = function (e) {
                if (e.keyCode === 46 || e.keyCode === 8) {
                    self.set()
                }
            }
            el.addEventListener('cut', self.onCut)
            el.addEventListener('keyup', self.onDel)
        }
    },
    // 更新值.
    _set: function () {
        this.ownerVM.$set(
            this.key, this.multi
                // 多选
                ? getMultipleSelectOptions(this.el)
                : this.el[this.attr]
        )
    },
    /**
     * 更新. 这里是完成 从 js数据到 元素节点的更新.
     */
    update: function (value, init) {
        /* jshint eqeqeq: false */
        // sync back inline value if initial data is undefined
        if (init && value === undefined) {
            return this._set()
        }
        if (this.lock) return
        var el = this.el
        if (el.tagName === 'SELECT') { // select dropdown
            el.selectedIndex = -1
            // 只有多选的值 返回是一个数组. 对值进行批量更新
            if(this.multi && Array.isArray(value)) {
                value.forEach(this.updateSelect, this)
            } else {
                // 单选则只需要执行一次
                this.updateSelect(value)
            }
        } else if (el.type === 'radio') { // radio button
            // 单选
            el.checked = value == el.value
        } else if (el.type === 'checkbox') { // checkbox
            // 复选框
            el.checked = !!value
        } else {
            // 更新该值. 
            el[this.attr] = utils.guard(value)
        }
    },
    // 更新选择. 值改变的时候, 触发 select 节点的更新
    updateSelect: function (value) {
        /* jshint eqeqeq: false */
        // setting <select>'s value in IE9 doesn't work
        // we have to manually loop through the options
        var options = this.el.options,
            i = options.length
        while (i--) {
            // 判断传入的值与 options的值是否相同. 相同则为 选中.
            if (options[i].value == value) {
                options[i].selected = true
                break
            }
        }
    },
    // 解绑. 取消所有监听事件
    unbind: function () {
        var el = this.el
        el.removeEventListener(this.event, this.set)
        el.removeEventListener('compositionstart', this.cLock)
        el.removeEventListener('compositionend', this.cUnlock)
        if (isIE9) {
            el.removeEventListener('cut', this.onCut)
            el.removeEventListener('keyup', this.onDel)
        }
    }
}