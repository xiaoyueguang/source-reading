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
`Koa`是基于`Node.js`的`http`原生模块, 来实现一个服务器.  
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

而后通过`callback`生成一个给`http`模块使用的回调, 对`http`的错误监听, 结束等做了处理, 对中间件的处理就在这关键的`compose`方法中.

### `compose`
```es6
  function compose (middleware) {
    // 检查中间件集合中是否符合
    if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
    for (const fn of middleware) {
      if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
    }

    return function (context, next) {
      // 当前索引位置
      let index = -1
      return dispatch(0)
      /**
       * 这个方法主要是处理如何调用中间件
       * 本质上是一个递归, 并且将递归执行下一个中间件的方法,
       * 赋值给next, 将控制权交给用户处理.
       * 而每次在next上await, 本质上就是对中间件方法await,
       * 从而形成, 在第一个中间件中执行到一半, 就等待第二个中间件执行
       * 直到最终所有的中间件都执行完毕, 再继续next之后的代码,
       * 待一个中间件里的方法执行完毕后, 返回一个Promise,
       * 从而让上一个中间件捕获到, 之后回到第一个中间件.
      */
      function dispatch (i) {
        // 防止执行多次
        if (i <= index) return Promise.reject(new Error('next() called multiple times'))
        index = i
        let fn = middleware[i]
        if (i === middleware.length) fn = next
        if (!fn) return Promise.resolve()
        try {
          return Promise.resolve(fn(context, function next () {
            // await next, 本质上就是 await dispatch. 也就是 await 中间件方法 fn
            return dispatch(i + 1)
          }))
        } catch (err) {
          return Promise.reject(err)
        }
      }
    }
  }
```
`compose`中, 最关键的就是属于`dispatch`方法, 上面的可能会比较抽象, 配合以下代码可能会更容易理解.

```es6
  const middleware = [
    async (ctx, next) => {
      console.log(1)
      await sleep()
      await next()
      console.log(5)
      await sleep()
      console.log(6)
    },
    async (ctx, next) => {
      console.log(2)
      await sleep()
      await next()
      console.log(3)
      await sleep()
      console.log(4)
    }
  ]
  function compose (middleware) {
    return function (context, next) {
      return dispatch(0)
      function dispatch (i) {
        let fn = middleware[i]
        return fn(ctx, function next () {
          return dispatch(i + 1)
        })
      }
    }
  }
  compose(middleware)
```
等同于
```es6
  function compose () {
    return function (context, next) {
      return dispatch(0)
      function dispatch (i) {
        let fn = async (ctx, next) => {
          console.log(1)
          await sleep()
          await next()
          console.log(5)
          await sleep()
          console.log(6)
        }
        return fn(ctx, function next () {
          return async (ctx, next) => {
            console.log(2)
            await sleep()
            await next()
            console.log(3)
            await sleep()
            console.log(4)
          }
        })
      }
    }
  }
  compose()
```
当`fn`执行之后, 声明的`next`被`await`后, 又会等同于以下代码
```es6
  function compose () {
    return function (context, next) {
      function dispatch (0) {
        let fn = async (ctx, next) => {
          console.log(1)
          await sleep()

          // 这里开始是等待第二个中间件执行完成
          await Promise.resolve((async (ctx, next) => {
            console.log(2)
            await sleep()
            await next()
            console.log(3)
            await sleep()
            console.log(4)
          })())

          // 回到上一个中间件
          console.log(5)
          await sleep()
          console.log(6)
        }
        return fn(ctx, function next () {
          
        })
      }
    }
  }
  compose()
```
因此, 代码就会按照顺序, 将数字打印出来, 从而实现了洋葱圈模型式.