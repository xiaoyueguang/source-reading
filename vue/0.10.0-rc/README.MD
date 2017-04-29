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
1. bindings: {object} 绑定类
2. children: {array} 子组件
3. computed: {array} 计算属性
4. data: {object} 监听的值
5. deferred: {array} 
6. delegators: {object}
7. destroyed: {boolean} 是否摧毁
8. dirs: {array} 指令集
9. el: {node} 节点
10. emitter: {Emitter} 观察
11. init: {boolean} 属性值
12. observer: {Emitter} 观察
13. options: {object} 选项
14. rawContent: {}
15. repeat: {boolean} 是否为repeat
16. vm: {ViewModel} 当前compoiler所属的实例