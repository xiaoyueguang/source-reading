# Vue 0.12.9

这个版本 相对与之前的版本, 目录结构变化很大. 同时用了ES6的语法.  
入口文件也被重命名成`Vue`了.  
先了解目录结构以及每个文件以及文件夹的作用.  

```
Vue
│  batcher.js 冲刷
│  cache.js 缓存
│  config.js 基本配置
│  directive.js 指令系统
│  vue.js 入口文件
│  watcher.js Watch
|
├─api 给Vue提供基础的API操作
│
├─compiler Vue 核心编译
|
├─directives 指令集合
|
├─element-directives 关于 节点的指令 比如说 html 或者 片段
|
├─filters 过滤器 包含各种各样的过滤器
|
├─instance Vue的核心实现
|
├─observer 如何监视对象 以及依赖收集
│
├─parsers 解析器. 解析指令, 表达式, 路径, 模版 依赖
│
├─transition 过渡
|
└─util 助手方法
```

> 虽然目录结构, 大部分代码都变了. 但是核心其实都是一样的.  
> 因此注释不会像之前那样, 每一行一个注释了..  
> 从`util`助手函数开始读吧. 然后再是入口文件, 按照 `Vue`实例化的过程顺序来读


* util
* vue
* batcher
* cache
* config
* directive
* watcher
* api
* compiler
* directives
* element
* filters
* instance
* observer
* parsers
* transition