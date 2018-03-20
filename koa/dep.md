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