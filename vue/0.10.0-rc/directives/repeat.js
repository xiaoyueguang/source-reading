/**
 * 循环
 * 
 */
var utils      = require('../utils'),
    config     = require('../config')

module.exports = {

    bind: function () {
        // 独一无二的标记
        this.identifier = '$repeat' + this.id

        var el   = this.el,
            ctn  = this.container = el.parentNode

        // extract child Id, if any
        // 取出节点里的内容 并且编译
        this.childId = this.compiler.eval(utils.attr(el, 'ref'))

        // create a comment node as a reference node for DOM insertions
        // 创建一个路标注释
        this.ref = document.createComment(config.prefix + '-repeat-' + this.key)
        ctn.insertBefore(this.ref, el)
        ctn.removeChild(el)
        // 定义
        this.initiated = false
        this.collection = null
        this.vms = null

    },

    update: function (collection) {
        // v-repeat 支持 循环 数组和对象
        // 这一步就是将 对象转为数组
        if (utils.typeOf(collection) === 'Object') {
            collection = utils.objectToArray(collection)
        }

        // if initiating with an empty collection, we need to
        // force a compile so that we get all the bindings for
        // dependency extraction.
        // 如果 收集到的依赖为空的话. 那就通过 创建子组件的方式 收集依赖
        if (!this.initiated && (!collection || !collection.length)) {
            this.dryBuild()
        }

        // keep reference of old data and VMs
        // so we can reuse them if possible
        // 将现有的 子组件实例 传到一个 旧实例中
        this.oldVMs = this.vms
        // 同样收集也是
        this.oldCollection = this.collection
        collection = this.collection = collection || []
        // 判断 收集器里的长度. 以及判断 元素是否为 对象
        var isObject = collection[0] && utils.typeOf(collection[0]) === 'Object'
        // 判断旧的收集器里是否存在元素.
        // 从而决定是进行 diff 操作 还是 init 操作
        this.vms = this.oldCollection
            ? this.diff(collection, isObject)
            : this.init(collection, isObject)
        // 父组件下 添加该子组件集合
        if (this.childId) {
            this.vm.$[this.childId] = this.vms
        }
    },

    /**
     *  Run a dry build just to collect bindings
     * 循环创建子组件
     */
    dryBuild: function () {
        var el = this.el.cloneNode(true),
            Ctor = this.compiler.resolveComponent(el)
        new Ctor({
            el     : el,
            parent : this.vm,
            compilerOptions: {
                repeat: true
            }
        // TODO: $destroy 有什么用?
        }).$destroy()
        // 初始化完成
        this.initiated = true
    },
    // 初始化
    init: function (collection, isObject) {
        var vm, vms = []
        // 创建一个数组
        for (var i = 0, l = collection.length; i < l; i++) {
            // 创建 vm实例
            vm = this.build(collection[i], i, isObject)
            vms.push(vm)
            if (this.compiler.init) {
                this.container.insertBefore(vm.$el, this.ref)
            } else {
                vm.$before(this.ref)
            }
        }
        return vms
    },

    /**
     *  Diff the new array with the old
     *  and determine the minimum amount of DOM manipulations.
     * 差异化.
     */
    diff: function (newCollection, isObject) {

        var i, l, item, vm,
            oldIndex,
            targetNext,
            currentNext,
            nextEl,
            ctn    = this.container,
            oldVMs = this.oldVMs,
            vms    = []

        vms.length = newCollection.length

        // first pass, collect new reused and new created
        // 第一步, 收集依赖 创建vm. 标记 reused
        // 比较新旧数据, 从数组 或对象里找出可复用的数据
        for (i = 0, l = newCollection.length; i < l; i++) {
            item = newCollection[i]
            if (isObject) {
                item.$index = i
                if (item[this.identifier]) {
                    // this piece of data is being reused.
                    // record its final position in reused vms
                    // 标记 可复用
                    item.$reused = true
                } else {
                    // 没有则创建一个
                    vms[i] = this.build(item, i, isObject)
                }
            } else {
                // we can't attach an identifier to primitive values
                // so have to do an indexOf...
                // 从原先的dom里查找内容
                oldIndex = indexOf(oldVMs, item)
                if (oldIndex > -1) {
                    // record the position on the existing vm
                    // 在老的数组上标记为 可复用
                    oldVMs[oldIndex].$reused = true
                    oldVMs[oldIndex].$data.$index = i
                } else {
                    // 没有则创建一个
                    vms[i] = this.build(item, i, isObject)
                }
            }
        }

        // second pass, collect old reused and destroy unused
        // 第二步, 收集老的 标记为 reused 以及 摧毁掉的unused
        // 比较新老的 vm 实例集合.在 新的 vm 实例集合里比较
        for (i = 0, l = oldVMs.length; i < l; i++) {
            vm = oldVMs[i]
            item = vm.$data
            if (item.$reused) {
                // 将数据上的 标记 转移到 vm实例上
                vm.$reused = true
                delete item.$reused
            }
            if (vm.$reused) {
                // 可复用的 则更新
                // update the index to latest
                vm.$index = item.$index
                // the item could have had a new key
                if (item.$key && item.$key !== vm.$key) {
                    vm.$key = item.$key
                }
                // 替换掉 某个 vm实例
                vms[vm.$index] = vm
            } else {
                // this one can be destroyed.
                // 不可复用的则摧毁掉且执行摧毁
                delete item[this.identifier]
                vm.$destroy()
            }
        }

        // final pass, move/insert DOM elements
        // 最后步, 移动或者添加 dom节点
        // 根据之前新生成的 vm 集合. 移动或添加dom节点
        i = vms.length
        while (i--) {
            vm = vms[i]
            item = vm.$data
            targetNext = vms[i + 1]
            if (vm.$reused) {
                nextEl = vm.$el.nextSibling
                // destroyed VMs' element might still be in the DOM
                // due to transitions
                // 当下一个存在 vue_vm 以及 非 标记注释时, 继续寻找下一个
                while (!nextEl.vue_vm && nextEl !== this.ref) {
                    nextEl = nextEl.nextSibling
                }
                currentNext = nextEl.vue_vm
                if (currentNext !== targetNext) {
                    if (!targetNext) {
                        // 在注释前插入值
                        ctn.insertBefore(vm.$el, this.ref)
                    } else {
                        nextEl = targetNext.$el
                        // new VMs' element might not be in the DOM yet
                        // due to transitions
                        while (!nextEl.parentNode) {
                            targetNext = vms[nextEl.vue_vm.$index + 1]
                            nextEl = targetNext
                                ? targetNext.$el
                                : this.ref
                        }
                        ctn.insertBefore(vm.$el, nextEl)
                    }
                }
                // 删除之前的标记
                delete vm.$reused
                delete item.$index
                delete item.$key
            } else { // a new vm
                // 如果是 新建的 vm实例, 直接在最后处插入该dom
                vm.$before(targetNext ? targetNext.$el : this.ref)
            }
        }

        return vms
    },
    /**
     * {object} data 数据;
     * {number} index 序号
     * {boolean} isObject 是否为对象. 确定值的处理方式.
     */
    build: function (data, index, isObject) {
        // wrap non-object values
        var raw, alias,
            wrap = !isObject || this.arg
        // 非对象
        if (wrap) {
            raw = data
            // 切割. 如果 v-repeat = 'item: items'
            // 则参数为 item. 否则默认为 $value
            alias = this.arg || '$value'
            // 默认传入 $index 为序号.
            data = { $index: index }
            // 传值
            data[alias] = raw
        }
        // 创建组件
        var el = this.el.cloneNode(true),
            Ctor = this.compiler.resolveComponent(el, data),
            vm = new Ctor({
                el: el,
                data: data,
                parent: this.vm,
                compilerOptions: {
                    repeat: true
                }
            })

        // attach an ienumerable identifier
        // 属性保护. 传入data 与 $index
        utils.defProtected(data, this.identifier, true)
        vm.$index = index

        if (wrap) {
            var self = this,
                sync = function (val) {
                    self.lock = true
                    // 锁定. 防止更新频繁
                    self.collection.$set(vm.$index, val)
                    self.lock = false
                }
            // 监听 更新.
            vm.$compiler.observer.on('change:' + alias, sync)
        }

        return vm

    },
    // 摧毁 全部的repeat 子组件
    unbind: function () {
        if (this.childId) {
            delete this.vm.$[this.childId]
        }
        if (this.vms) {
            var i = this.vms.length
            while (i--) {
                this.vms[i].$destroy()
            }
        }
    }
}

// Helpers --------------------------------------------------------------------

/**
 *  Find an object or a wrapped data object
 *  from an Array
 * 从一个 vm的集合里 查找 某个 vm实例. 返回序号
 */
function indexOf (vms, obj) {
    for (var vm, i = 0, l = vms.length; i < l; i++) {
        vm = vms[i]
        if (!vm.$reused && vm.$value === obj) {
            return i
        }
    }
    return -1
}