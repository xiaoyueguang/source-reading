const path = require('path')

module.exports = function () {
  return {
    entry: './vue/0.12.9/vue.js',
    output: {
      path: path.resolve(__dirname, '../../dist'),
      filename: 'vue.js'
    }
  }
}