// Credits: borrowed code from fcomb/redux-logger
/**
 * Logger 插件
 * 将 mutation 触发顺序从控制台中打印出来
 */
import { deepCopy } from '../util'
/**
 * 通过参数 返回一个配置好的Logger.
 * @param {object} param 配置项
 *  - @param {boolean} collapsed 是否展开.为 false 时, 会展开
 *  - @param {function} 过滤方法. 返回为 true 的才会进行打印
 *  - @param {transformer} 处理状态, 如何对状态打印
 *  - @param {mutationTransformer} 处理mutation
 */
export default function createLogger ({
  collapsed = true,
  filter = (mutation, stateBefore, stateAfter) => true,
  transformer = state => state,
  mutationTransformer = mut => mut
} = {}) {
  // store 为初始化后的 vuex
  return store => {
    // 先利用深复制, 复制出状态. 浅复制有可能会修改原先的状态
    let prevState = deepCopy(store.state)
    // 观察者监听 mutation 执行情况
    store.subscribe((mutation, state) => {
      if (typeof console === 'undefined') {
        return
      }
      // 触发 mutation 后深复制状态.
      const nextState = deepCopy(state)
      // 判断是否符合过滤
      if (filter(mutation, prevState, nextState)) {
        const time = new Date()
        const formattedTime = ` @ ${pad(time.getHours(), 2)}:${pad(time.getMinutes(), 2)}:${pad(time.getSeconds(), 2)}.${pad(time.getMilliseconds(), 3)}`
        const formattedMutation = mutationTransformer(mutation)
        // mutation 信息
        const message = `mutation ${mutation.type}${formattedTime}`
        // 根据配置项, 来确定是否展开
        const startMessage = collapsed
          // 不展开
          ? console.groupCollapsed
          // 展开
          : console.group

        // render
        // 打印
        try {
          startMessage.call(console, message)
        } catch (e) {
          console.log(message)
        }
        // 打印
        console.log('%c prev state', 'color: #9E9E9E; font-weight: bold', transformer(prevState))
        console.log('%c mutation', 'color: #03A9F4; font-weight: bold', formattedMutation)
        console.log('%c next state', 'color: #4CAF50; font-weight: bold', transformer(nextState))

        try {
          console.groupEnd()
        } catch (e) {
          console.log('—— log end ——')
        }
      }
      // 处理完成后, 将当前状态以下个状态替换掉
      prevState = nextState
    })
  }
}
/**
 * 以 str 字符进行重复
 * @param {number|string} str 待重复字符
 * @param {number} times 重复次数
 * @return {string} 重复的字符
 */
function repeat (str, times) {
  return (new Array(times + 1)).join(str)
}
/**
 * 用0 左补充
 * @param {number|string} num 数值
 * @param {number|string} maxLength 补充到最长长度
 */
function pad (num, maxLength) {
  return repeat('0', maxLength - num.toString().length) + num
}
