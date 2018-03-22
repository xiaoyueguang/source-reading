# koa中的依赖

## is-generator-function

>判断是否为`Generator`方法
* 先判断是否为方法
* 其次利用函数原型上的`toString`方法, 获取方法的字符串, 正则匹配 `* function`,
* 上面没通过时, 则根据当前环境是否有`Symbol`,进行判断.
* 没`Symbol`时, 则利用对象上的原型方法`toString`, 读取方法的类型, 并判断`object GeneratorFunction`是否一致
* 有`Symbol`时, 则直接执行一个`Function`, 返回一个生成器代码`(Function('return function*() {}')())`并执行, 将拿到的方法和传入的方法的原型拿过来比较判断是否一致.

## debug

> 一款方便的调试工具.  
> 直接引用进来为一个方法, 传入模块名后可得到一个用来调试打印的方法
```
const debug = require('debug')('module:name')

debug('start')
debug('stop')
```
以上代码可在控制台中看到
```
module:name start +4ms
module:name stop +5ms
```
能非常直观的看到打印的模块名以及对应的方法.

## on-finished
> 在`Http`连接关闭, 完成或出错时, 执行回调.

## koa-compose
> 接收一组中间件, 返回一个中间件方法.  
> `KOA`的中间件执行方法, 洋葱模型就是基于这个实现的.

## koa-is-json
> 检查是否为 json

## statuses
> `Http`状态码. 可以根据状态码或者值来获取对应的数据

## cookies
> 服务端的解析`cookie`库

## accepts
> 服务端接受到请求后, 根据接收的类型返回对应的类型值

## only
> 接收一个对象和对应的`key`值, 返回只有`key`的对象

## koa-convert
> 转换中间件. 将不兼容`koa2`的中间件转换, 使之兼容`koa2`

## depd
> 接收模块名后, 返回一个匿名方法, 调用后可打印出  
> 模块名, 值, 调用的文件以及行数

## http-errors
> 快速创建http报错

## http-assert
> 对状态码断言

## delegates
> 委托. 将对象上的某个属性的属性代理到该对象上

## content-type
> 处理http头的 content-type

## parseurl
> 格式化URL

## type-is
> 推断请求的数据类型

## fresh
> 检查响应是否有缓存.