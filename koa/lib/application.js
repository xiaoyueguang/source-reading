
'use strict';

/**
 * Module dependencies.
 * 这里引用了许多依赖. 依赖文件作用可在 dep.md中了解
 */

const isGeneratorFunction = require('is-generator-function');
const debug = require('debug')('koa:application');
const onFinished = require('on-finished');
const response = require('./response');
const compose = require('koa-compose');
const isJSON = require('koa-is-json');
const context = require('./context');
const request = require('./request');
const statuses = require('statuses');
const Cookies = require('cookies');
const accepts = require('accepts');
const Emitter = require('events');
const assert = require('assert');
const Stream = require('stream');
const http = require('http');
const only = require('only');
const convert = require('koa-convert');
const deprecate = require('depd')('koa');

/**
 * Expose `Application` class.
 * Inherits from `Emitter.prototype`.
 * 声明`Application`类, 集成自`Node.js`原生的事件
 */

module.exports = class Application extends Emitter {
  /**
   * Initialize a new `Application`.
   * 初始化一个新的应用
   * @api public
   */

  constructor() {
    super();

    this.proxy = false;
    // 中间件集合
    this.middleware = [];
    this.subdomainOffset = 2;
    // 环境.
    this.env = process.env.NODE_ENV || 'development';
    // 创建`koa`中间件中上的主要变量
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
  }

  /**
   * Shorthand for:
   *
   *    http.createServer(app.callback()).listen(...)
   * listen. 调用`Node.js`原生的方法
   * @param {Mixed} ...
   * @return {Server}
   * @api public
   */

  listen(...args) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  /**
   * Return JSON representation.
   * We only bother showing settings.
   * 返回一个只有设置的对象
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  /**
   * Inspect implementation.
   * 通过该接口进行检查
   *
   * @return {Object}
   * @api public
   */

  inspect() {
    return this.toJSON();
  }

  /**
   * Use the given middleware `fn`.
   *
   * Old-style middleware will be converted.
   * use方法. 将方法传入中间件集合.
   * 返回`this`实现链式调用
   *
   * @param {Function} fn
   * @return {Application} self
   * @api public
   */

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

  /**
   * Return a request handler callback
   * for node's native http server.
   * 返回一个匿名方法, 以供创建`Http`服务调用
   *
   * @return {Function}
   * @api public
   */

  callback() {
    const fn = compose(this.middleware);
    // 继承自事件的方法.
    if (!this.listeners('error').length) this.on('error', this.onerror);
    // 这个方法由`http.createServer`调用
    const handleRequest = (req, res) => {
      // 创建一个属于`koa`上下文的ctx. 供中间件调用
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  /**
   * Handle request in callback.
   * 匿名方法
   * 默认404
   *
   * @api private
   */

  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    // 错误处理
    const onerror = err => ctx.onerror(err);
    // 响应处理
    const handleResponse = () => respond(ctx);
    // 通过`onFinished`, 来处理完成, 关闭或出错.
    onFinished(res, onerror);
    // 待中间件全部处理完之后, 再执行then.
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  /**
   * Initialize a new context.
   * 初始化`koa`的上下文
   * @api private
   */

  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    // 给上下文以及原生的请求头和响应头均添加所需要的值 方便调用
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.cookies = new Cookies(req, res, {
      keys: this.keys,
      secure: request.secure
    });
    request.ip = request.ips[0] || req.socket.remoteAddress || '';
    context.accept = request.accept = accepts(req);
    context.state = {};
    return context;
  }

  /**
   * Default error handler.
   * 报错处理. 根据配置文件来确定是否打印值.
   * @param {Error} err
   * @api private
   */

  onerror(err) {
    assert(err instanceof Error, `non-error thrown: ${err}`);

    if (404 == err.status || err.expose) return;
    if (this.silent) return;

    const msg = err.stack || err.toString();
    console.error();
    console.error(msg.replace(/^/gm, '  '));
    console.error();
  }
};

/**
 * Response helper.
 * 回应
 */

function respond(ctx) {
  // allow bypassing koa
  if (false === ctx.respond) return;

  const res = ctx.res;
  if (!ctx.writable) return;

  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  // 当状态码属于空时, 直接设置body为空
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null;
    return res.end();
  }
  // HEAD 方法只需要获取请求头长度
  if ('HEAD' == ctx.method) {
    if (!res.headersSent && isJSON(body)) {
      // 字节
      ctx.length = Buffer.byteLength(JSON.stringify(body));
    }
    return res.end();
  }

  // status body
  if (null == body) {
    body = ctx.message || String(code);
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  // 属于流的时, pipe出来
  if (body instanceof Stream) return body.pipe(res);

  // body: json
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
