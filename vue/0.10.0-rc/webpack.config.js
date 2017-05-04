const path = require('path')

module.exports = function () {
  return {
    entry: './vue/0.10.0-rc/viewmodel.js',
    output: {
      path: path.resolve(__dirname, '../../dist'),
      filename: 'vue.js'
    }
  }
}