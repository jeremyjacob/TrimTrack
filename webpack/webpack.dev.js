const merge = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge.merge(common, {
    devtool: 'inline-source-map',
    mode: 'development',
})