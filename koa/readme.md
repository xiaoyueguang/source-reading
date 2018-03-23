# Koa.js 源码解读

阅读源码, 首先要先了解项目的功能, 然后带着对功能如何实现的疑问去看源码.

先看`Koa`是如何使用的, 以下是官方的例子, 加了些注释:
```es6
  const Koa = require('koa')
  // `Koa`实例化后, 会生成一个中间件集合, 用来放置通过`.use`传入的中间件.
  // 并且生成基于`Node.js`模块`http`的`request`与`response`对象的上下文.
  const app = new Koa()
  // 对传入的方法检测, 并传入`Koa`的中间件集合
  // x-response-time
  app.use(async (ctx, next) => {
    const start = Date.now()
    console.log(1)
    await next()
    console.log(8)
    const ms = Date.now() - start
    ctx.set('X-Response-Time', `${ms}ms`)
  })

  // logger
  app.use(async (ctx, next) => {
    const start = Date.now()
    console.log(2)
    await next()
    console.log(7)
    const ms = Date.now() - start
    console.log(`${ctx.method} ${ctx.url} - ${ms}`)
  })

  app.use(function * (next) {
    console.log(3)
    yield next
    console.log(6)
  })
  // response
  app.use(async ctx => {
    console.log(4)
    ctx.body = 'Hello World'
    console.log(5)
  })

  // 动态的生成一个`Http`实例, 传入一个`Koa`生成的回调, 并进行监听.
  app.listen(3000)
  // 浏览器访问后 输出 1 2 3 4 5 6 7 8.
```
这里可以看到
1. 一个简单的`listen()`就能够启动一个服务器.  
2. 中间件也能够兼容早先版本的方式.  
3. `Koa`的中间件执行顺序, 并不是`Express`的那种串联执行的方式.  

带着这些问题, 来慢慢解读源码.

## 启动服务器
```es6
  listen(...args) {
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }
```
可以看到, `Koa`还是基于`Node.js`的`http`原生模块, 来实现一个服务器.  
利用ES6的扩展运算符`...`, 将获得传入的参数集合传入到`http`实例的`listen`中来实现监听.  



## 兼容上个版本的中间件
TODO:



## 洋葱圈模型
在一开始的代码中, 浏览器访问后, 会按照顺序打印出数字, 这就是`Koa`的洋葱圈模型.  
每次的网络请求都会从第一个中间件开始, 到最后个中间件, 然后再返回回到第一个中间件.  
这种模型可以很方便的对其中的中间件进行前置操作或后置操作, 或选择是否执行下个中间件.  
那么先来看看`Koa`是怎么实现这部分的.

```es6
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
  }
```
`Koa`通过`use`将方法传入到自己的中间件集合中, 并对方法做了转换, 将`Generator`方法转成所需要的格式.