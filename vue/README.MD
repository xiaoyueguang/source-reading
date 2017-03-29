# VUE
入口文件: /entries/

2017/3/27 目前已大致了解 `/shared/`, `/entries`两个文件夹的作用.

接下来需要按照以下顺序读源码
1. `core/index`
2. `core/instance`
3. `core/observer` 监听
4. `core/global-api` 全局API
5. `core/vdom` VDOM 实现
6. `core/components` 默认组件
7. `compiler/index` 待定
8. `platforms/` 待定
9. `sfc/` 待定

2017/3/29
> 果然项目有点复杂. 读起来比较吃力.  
> 决定先 fork `vue`项目, 从最开始的 `tag`处开始读, 即`0.10.0-rc`文件夹.  
> 慢慢往后面读. 相信理解速度会快.  
> 原先在读的放 `dev`文件夹.  