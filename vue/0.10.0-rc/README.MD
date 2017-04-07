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
          partial.js // 
          repeat.js // v-repeat
          style.js  // v-style
          view.js   // 
          with.js   // 
```

## 顺序

1. utils
2. config
3. observer
4. viewmodel
5. main
6. filters
- transition
8. emitter
- text-parser
- exp-parser
- deps-parser
12. batcher
13. binding
14. directive
- directives文件夹
- compiler

> 从 `filters`, `transition`开始感觉有点抽象了.  
> 需要写类似的代码, 利用调试来明白各个参数的意义了