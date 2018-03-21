const log = require('debug')('打印')

function compose (middleware) {
  return function (context, next) {
    return dispatch(0)

    function dispatch (i) {
      if (i === middleware.length) return false
      const fn = middleware[i]
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
  async (context, next) => {
    log(3)
    await (sleep(.4))
    log(4)
    await next()
    log(9)
    await (sleep(.4))
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

