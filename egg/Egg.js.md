# Egg.js 源码阅读

最近花了一些时间, 用`Egg.js`开发了一些东西, 比如作为接口服务器, 或网页服务器, 从中了解利用`Egg.js`开发应用比`Koa`或`Express`开发应用多出来的优势.  

## 什么是`Egg.js`?

> `Egg.js` 为企业级框架和应用而生

`Egg.js`提供了`web`开发的核心功能以及一套灵活易扩展的插件机制, 同时奉行**约定大于配置**, 降低团队之间的协作成本.  

本文打算通过阅读源码, 来理解`Egg.js`是如何实现以下特点的.

* 路由
* 程序的健壮性
* 插件

## 基本架构与内置对象
`Egg.js`基于`Koa`开发, 本身拥有`Koa`的4个对象`Application`, `Context`, `Request`, `Response`, 同时增加了`Controller`, `Service`, `Helper`, `Config`, `Logger`. 严格来说不算一个`MVC`模式, 缺少了`model`层和`view`层. 以下为这几个对象的功能描述.

* `Application`: 继承自`Koa`, 全局唯一应用对象. 挂在方法或对象.
* `Context`: 请求级别对象, 用户通过网络访问应用时, 会实例化出一个全新的对象, 通过该对象可获取请求信息或设置响应信息
* `Request`: 请求级别对象, 封装原生对象`Request`, 用于获取请求信息
* `Response`: 请求级别对象, 封装原生对象`Response`, 用于设置响应信息
* `Controller`: 控制器, 用来处理业务流程.
* `Service`: 服务层, 抽象控制器中的复杂业务流程, 保证服务可重用.
* `Helper`: 助手方法, 提供一些便利性的工具.
* `Config`: 配置, 获取配置文件中的配置选项.
* `Logger`: 日志功能.

### 加载器Loader
`Egg.js`是基于一定的约定, 在`Koa`上进行增强, 约定不同功能放到不同的目录下管理, 并有了自己的目录结构.

`Egg.js`由`Loader`进行加载, 在`egg-core/lib/loader`中, `Loader`分为三种:
|Loader|名称|作用|
|:--|:--|:--|
|egg_loader|框架加载器|负责加载框架|
|file_loader|文件加载器|负责从目录中加载文件到目标对象|
|context_loader|文件加载器, 懒初始化|与file_loader一致, 多了懒初始化|

#### file_loader
通过该方法加载文件时, 会调用`utils.loadFile`进行加载, `loadFile`会通过后缀名, 读取文件(`fs.readFileSync`)或加载文件(`require`).

通过加载的文件, 识别后传到目标对象中.

#### context_loader
该方法通过`Object.defineProperty`, 访问属性时才执行生成, 实现懒初始化.

```javascript
function defineProperty(property, values) {
  Object.defineProperty(this, property, {
    get() {
      let instance = this._cache.get(property);
      if (!instance) {
        // 生成实例
        instance = getInstance(values, this._ctx);
        this._cache.set(property, instance);
      }
      return instance;
    },
  });
}
```

## 路由
路由主要用来描述`URL`与控制器(`Controller`)之间的关系, 约定所有的路由规则统一写在`app/router.js`中.  

`Egg.js`基于`Koa`开发, 因此路由功能直接基于`koa-router`实现并扩展, 新增`resources`触发动作等.

### 控制器的字符串引用
原先的`koa-router`声明一个路由, 需要传入一个闭包方法, 来描述用户访问到该路由上所需要处理的逻辑, 如下:
```javascript
router.get('user', '/users/:id', (ctx, next) => {
  // 处理操作逻辑
});
```

而在`Egg.js`中, 则可以直接传入字符串, 由`Egg.js`自动查找对应的控制器.

```javascript
const { router, controller } = app;
router.get('/', controller.home.index);
// 直接传入字符串也可
rouetr.get('/', 'home.index')
```

具体的则是通过`egg-core/lib/utils/router.js`中的`resolveController`方法实现.  
这里`Egg.js`有个约束, 控制器会严格按照`文件名/方法`或`文件夹名/文件名/方法`来生成.  

```javascript
// 当控制器传入的为字符串时, 则执行以下逻辑
const actions = controller.split('.');
// 因为控制器这多了一层约束, 因此这里可以直接循环来获取最终的方法.
let obj = app.controller;
actions.forEach(key => {
  obj = obj[key];
  if (!obj) throw new Error(`controller '${controller}' not exists`);
});
```

### 新增`resources`触发动作
原先`koa-router`支持的方法仅仅为`HTTP`所支持的部分方法(`get|put|post|patch|delete|del`), `Egg.js`则添加了`resources`触发动作.

`resources`主要可以快速添加一系列支持`RESTful`的路由. 具体的实现参考`egg-core/lib/utils/router.js`中`Router`类的`resources`方法. 该方法通过预先定义的`REST_MAP`对象, 转变为`router.verb`来注册对应的路由.

## 程序的健壮性
之前还未接触到`pm2`或`Egg.js`的时候, 我都是通过`nohup node xxx.js&`来启动后台服务, 后来发现会有问题: 系统报错了, 就会悄无声息的退出, 使得我不得不多次重启服务.  后来发现用`pm2`或`Egg.js`启动的程序, 发现程序会很稳定的启动在服务器上, 很少看到服务器彻底关掉的情况, 这种叫做程序的健壮性, 是作为企业应用必要考虑的问题.

`Egg.js`通过`egg-cluster`来实现较高的健壮性. `egg-cluster`会生成一个`Master`进程, 一个`Agent`进程以及CPU核心数`Worker`进程.

而在`Master`中, 通过`cfork`模块创建`Worker`进程, 本质上就是采用`Node.js`自带的`cluster`, 来保证程序出错后, 立即执行.

```javascript
/**
 * Master.forkAppWorkers
 */
// 创建进程. 保证进程具有重载功能
cfork({
  exec: this.getAppWorkerFile(),
  args,
  silent: false,
  count: this.options.workers,
  // don't refork in local env
  refork: this.isProduction,
});
/** 重载 */
function forkWorker(settings) {
  if (settings) {
    cluster.settings = settings;
    cluster.setupMaster();
  }
  return cluster.fork(attachedEnv);
}
```

## 插件
`Egg.js`提供了非常完善的插件机制, 通过该插件机制, 可以灵活的给框架添加所需的功能.  

开启只需安装好插件后, 同时在`config/plugin.js`中添加所需的插件配置.

```javascript
exports[PLUGIN_NAME] = {
  enable: true,
  package: PLUGIN_NAME,
};
```

框架在启动时, 会去解析该`config/plugin.js`文件, 并通过`loadPlugin`方法去加载对应的插件并启动.

## 总结
看了`Egg.js`的部分代码并了解了一些实现的原理, 感觉这框架真不愧为企业级框架, 利用`egg-cluster`, 保证程序的稳定, 提供了不错的路由, 同时实现一套完善的插件机制, 利用插件将无限制的扩展`Egg.js`的功能, 几乎满足了企业开发所需的要求, 甚至在开发方面还提供了`egg-ts-helper`库, 保证开发时能获得更好的开发体验.
