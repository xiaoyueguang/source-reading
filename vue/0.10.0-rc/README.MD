# VUE

首先先整理目录结构. 了解每个文件的作用以及入口文件.

```
  Vue
  │  batcher.js       // 批处理
  │  binding.js       // 绑定.
  │  compiler.js      // 编译
  │  config.js        // vue 全局配置
  │  deps-parser.js   // 消息 解析
  │  directive.js     // 指令
  │  emitter.js       // 消息订阅器(观察者)
  │  exp-parser.js    // 事件 解析
  │  filters.js       // 过滤器
  │  main.js          // 为 ViewModel 添加原型方法
  │  observer.js      // 将对象转为观察对象
  │  text-parser.js   // 文字解析
  │  transition.js    // 过渡
  │  utils.js         // 助手函数
  │  viewmodel.js     // 定义一个 ViewModel 构造函数, 并绑定各种方法.
  │                   // ViewModel即 vue的前身
  └─directives      // 指令文件夹
          html.js   // v-html
          if.js     // v-if
          index.js  
          model.js  // v-model
          on.js     // 绑定事件
          partial.js // 片段
          repeat.js // v-repeat
          style.js  // v-style
          view.js   // 
          with.js   // 将父值传给子组件
```

> 从 `filters,transition`开始感觉有点抽象了.  
> 需要写类似的代码, 利用调试来明白各个参数的意义了

## vue的实例化的过程
1. 默认引用的`Vue`由 `vviewmodel.js`中导出
2. `viewmodel.js`该文件中定义了 `Vue`的一些私有方法, 比如 `$get, $set`等. 同时定义了 Vue 实例化所需要的操作`new Compiler`.
3. `Compiler`文件,

## vue $compiler 属性解析
* bindings: {object} 绑定类
  * key: {Binding} 绑定类
* children: {array} 子组件
  * key: {ViewModel} 子组件
* computed: {array} 计算属性
  * key: {Binding} 绑定类
* data: {object} 监听的值
  * key: {any} 经过监听的值
  * __emitter__: {Emitter} 监听
* deferred: {array} 
* delegators: {object}
* destroyed: {boolean} 是否摧毁
* dirs: {array} 指令集
* el: {node} 节点
* emitter: {Emitter} 观察
* init: {boolean} 属性值
* observer: {Emitter} 观察
* options: {object} 选项
* rawContent: {}
* repeat: {boolean} 是否为repeat
* vm: {ViewModel} 当前compoiler所属的实例

## Binding 绑定类
* id: {number} 递增序号(唯一值)
* compiler: {Compiler} 当前绑定类所绑定的类
* key: {string} 字符串
* root: {boolean} 表明该 key值是否为根节点.
* value: {any} 指令生成的值
* isExp: {boolean} 是否表达式
* isFn: {boolean} 是否为函数
* unbound: {boolean} 是否未绑定
* dirs: {array} 指令集合. 该值修改后, 所需要通知的指令.
* subs: {array} 指令集合. 该值修改后, 所需要通知的指令.(与上面的区别是该指令集里的指令可能是表达式 或 计算属性的.)
* deps: {array} 指令集合. 通知来源. 表明该指令受 deps里指令的控制. 当 deps里的指令有更新时, 会通知到该指令

## Directive 指令.
> 指令是用来将 data 转为 view 的一种方式.  
> 每一种指令都会有 `bind`, `update`, `unbind`方法.  
> 分别代表 绑定, 更新, 以及解绑.  
* id: {number} 递增序号(唯一值)
* key: {string} 指令名
* attr: {string} 属性类型
* name: {string} 指令类型
* filters: {any} 过滤器
* expression: {Exp} 表达式
* el: {node} 该指令绑定的节点
* bind: {function} 指令的绑定方式
* computerFilters: {boolean} 是否需要计算
* isExp: {boolean} 是否为表达式
* value: {any} 获取到的最新的值
* vm: {ViewModel} 拥有该指令的 vm实例
* binding: {Binding} 绑定该指令的绑定类
* compiler: {Compiler} 拥有该指令的 编译类
* _update: {function} 更新节点的方法.

## Emitter

