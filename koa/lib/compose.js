const log = require('debug')('打印')
const co = require('co')

/**
 * @param {function} 生成器中间件
 */
function convert (mw) {
  /**
   * @param {object} ctx 上下文
   * @param {function} next 中间件. `async/await`
   * @return {promise} 转换后的中间件
   */
  function converted (ctx, next) {
    // 处理上个版本
    return co.call(
      // 绑定co作用域
      ctx,
      // 绑定作用域, 同时传入回调, 即中间件中调用的next方法
      mw.call(ctx, function *() {
        // 调用下个中间件方法
        return yield next()
    }))
  }
  return converted
}


function compose (middleware) {
  return function (context, next) {
    return dispatch(0)

    function dispatch (i) {
      if (i === middleware.length) return false
      let fn = middleware[i]
      if (i === 1) {
        fn = convert(fn)
      }
      return fn(context, function next () {
        // await next() 实质上就是 await dispatch
        return dispatch(i + 1)
      })
    }
  }
}

const sleep = time => new Promise(resolve => {
  setTimeout(() => resolve(), time * 1000)
})

const a = compose([
  async (context, next) => {
    log(1)
    await (sleep(.4))
    log(2)
    await next()
    log(11)
    await (sleep(.4))
    log(12)
  },
  // async (context, next) => {
  //   log(3)
  //   await (sleep(.4))
  //   log(4)
  //   await next()
  //   log(9)
  //   await (sleep(.4))
  //   log(10)
  // },
  function * (next) {
    log(3)
    yield sleep(.4)
    log(4)
    yield next()
    log(9)
    yield sleep(.4)
    log(10)
  },
  async (context, next) => {
    log(5)
    await (sleep(.4))
    log(6)
    await next()
    log(7)
    await (sleep(.4))
    log(8)
  }
])

a()

