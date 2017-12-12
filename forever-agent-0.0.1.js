module.exports = ForeverAgent
// 模块的输出就是exports,exports是module的属性,对外暴露变量为函数ForeverAgent
// 将ForeverAgent作为模块暴露出去
ForeverAgent.SSL = ForeverAgentSSL  // 对ForeverAgent进行SSL加密

var util = require('util') 
/* 获取 util 对象
util 是一个 Node.js 核心模块，提供常用函数的集合，用于弥补核心Javascript 功能过于精简的不足
在 JavaScript 代码中可以直接使用全局函数 require() 来加载一个模块
require() 方法的返回值是该模块所暴露出来的公开 JavaScript 对象，包含了可供使用的方法和属性
一般是直接把 require() 方法的返回值赋值给一个变量，在 JavaScript 代码中直接使用此变量即可
*/
  , Agent = require('http').Agent  // 把http模块的Agent属性赋值给Agent
  , net = require('net')  // 引入net模块，与 TCP 协议相关的实现在 net 模块中
  , tls = require('tls')  // 引入tls模块，模块 tls 可以实现安全的套接字连接（SSL）
  , AgentSSL = require('https').Agent  // 把https的Agent属性赋值给AgentSSL
  
function getConnectionName(host, port) {  
/*
  为请求选项的集合获取一个唯一的名称，用来判断一个连接是否可以被复用。 
  对于 HTTP 代理，返回 host:port:localAddress 或 host:port:localAddress:family
  host <string> 请求发送至的服务器的域名或 IP 地址。
  port <number> 远程服务器的端口。
  如果想连接到一个已有的 TCP 服务器的话，可以使用 createConnection(port, host) 方法来连接到指定主机 host 的端口 port 上
  该方法的返回值是 Socket 类的实例，表示一个套接字连接
*/
  var name = '' // 定义name属性
  if (typeof host === 'string') {   // 如果host的数据类型等于字符串        
    name = host + ':' + port      // 执行此条命令
  } else {
    // For node.js v012.0 and iojs-v1.5.1, host is an object. And any existing localAddress is part of the connection name.
    // 对于node . js v012.0和iojs -v1.5.1，主机(host)是一个对象。并且任何现有的localaddress都是连接名称的一部分。
    name = host.host + ':' + host.port + ':' + (host.localAddress ? (host.localAddress + ':') : ':')
    // localAddress <string> 当发送请求时，为网络连接绑定的本地接口。
    // host.localAddress如果是true执行 host.localAddress + ':' ,  false执行':'
  }
  return name   
}    

function ForeverAgent(options) {  // 构造函数，创建 ForeverAgent函数，参数为options
  var self = this
  /*  把this赋值给self变量，为了在内部函数能使用外部函数的this对象,
      在自定义函数中，this对象指向的是调用这个函数的对象，也就是说，this指向的是调用执行环境的那个对象。
   */
  self.options = options || {}  // 调用函数时,如果 options 没指定，就给它赋值 {} , {} 是一个空的 Object
  self.requests = {}  //  返回一个对象，包含还未被分配到 socket 的请求队列
  self.sockets = {}   // 返回一个对象，包含当前正被代理使用的 socket 数组
  self.freeSockets = {}  // 返回一个对象，包含当前正在等待被启用了 keepAlive 的代理使用的 socket 数组
  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets
  /*
   Agent.maxSockets:该属性可设置代理为每个来源打开的并发 socket 的最大数量。 来源是 agent.getName() 的返回值。
   调用函数时,如果 self.options.maxSockets 没指定，就给它赋值 Agent.defaultMaxSockets
  */
  self.minSockets = self.options.minSockets || ForeverAgent.defaultMinSockets
  /*
   该属性可设置代理为每个来源打开的并发 socket 的最小数量
   调用函数时,如果 self.options.minSockets 没指定，就给它赋值 ForeverAgent.defaultMinSockets
   */
  self.on('free', function(socket, host, port) { // 执行 free 函数 
    var name = getConnectionName(host, port)      //
    if (self.requests[name] && self.requests[name].length) {
      //
      self.requests[name].shift().onSocket(socket)   
      //shift() 方法用于把数组的第一个元素从其中删除，并返回第一个元素的值
    } else if ( self.sockets[name] && self.sockets[name].length < self.minSockets) {
      //
      if (!self.freeSockets[name]) self.freeSockets[name] = []
      //
      self.freeSockets[name].push(socket)
      //push() 方法可向 self.freeSockets[name] 数组的末尾添加 socket ，并返回新的长度
      
      // if an error happens while we don't use the socket anyway, meh, throw the socket away
      //如果在我们不使用套接字时发生错误，meh，将套接字丢弃
      var onIdleError = function() { 
        socket.destroy()  // 销毁当前正被代理使用的任何 socket
      }
      socket._onIdleError = onIdleError // 把 onIdleError 方法赋值给socket
      socket.on('error', onIdleError)  //'error' 触发 onIdleError 方法
    } else {
      // If there are no pending requests just destroy the    //  如果没有挂起的请求，只销毁
      // socket and it will get removed from the pool. This   //  套接字，它将从池中删除。这
      // gets us out of timeout issues and allows us to       //  使我们摆脱超时问题，并允许我们
      // default to Connection:keep-alive.                    //  默认连接: keep-alive
      socket.destroy()    // 销毁当前正被代理使用的任何 socket
    }
  })

}
util.inherits(ForeverAgent, Agent)  // 实现对象间原型继承的函数，确定继承关系，Agent继承ForeverAgent 
ForeverAgent.defaultMinSockets = 5  //赋值为5 

ForeverAgent.prototype.createConnection = net.createConnection
// 把net.createConnection 赋值给 ForeverAgent原型函数
// agent.createConnection 创建一个用于 HTTP 请求的 socket 或流
ForeverAgent.prototype.addRequestNoreuse = Agent.prototype.addRequest
// Agent原型函数的addRequest 继承 
ForeverAgent.prototype.addRequest = function(req, host, port) {
  var name = getConnectionName(host, port)
  // agent.getName(options) 为请求选项的集合获取一个唯一的名称，用来判断一个连接是否可以被复用。 
  if (typeof host !== 'string') {  // 如果host的数据结构 不等于 字符型
    var options = host  // 定义option，把host赋值于它
    port = options.port
    host = options.host
  }

  if (this.freeSockets[name] && this.freeSockets[name].length > 0 && !req.useChunkedEncodingByDefault) {
    // 存在this.freeSockets[name]，长度不为零，
    var idleSocket = this.freeSockets[name].pop() // pop() 方法用于删除并返回数组的最后一个元素,赋值给 idleSocket
    idleSocket.removeListener('error', idleSocket._onIdleError) 
    // 移除指定事件的某个监听器 时间类型：'error' 监听器：idleSocket._onIdleError
    delete idleSocket._onIdleError // 删除
    req._reusedSocket = true // 获取reusedSocket 为 true
    req.onSocket(idleSocket) // 获取
  } else {
    this.addRequestNoreuse(req, host, port) //
  }
}

ForeverAgent.prototype.removeSocket = function(s, name, host, port) {
  // removeSocket 方法，参数为 s, name, host, port
  if (this.sockets[name]) {
    var index = this.sockets[name].indexOf(s) // indexOf() 索引，返回's'在 this.sockets[name] 中首次出现的位置，赋值给 index
    if (index !== -1) {     
      this.sockets[name].splice(index, 1) // splice()从数组中删除 index ，然后返回被删除的项目
    }
  } else if (this.sockets[name] && this.sockets[name].length === 0) {
    // this.sockets[name] 存在 并且 等于 0
    // don't leak(漏)
    delete this.sockets[name]
    delete this.requests[name] // 删除两项
  }
  
  if (this.freeSockets[name]) {
    var index = this.freeSockets[name].indexOf(s) // indexOf() 索引，返回's'在 this.freeSockets[name] 中首次出现的位置，赋值给 index
    if (index !== -1) {
      this.freeSockets[name].splice(index, 1) // splice()从数组中删除 index ，然后返回被删除的项目
      if (this.freeSockets[name].length === 0) { 
        delete this.freeSockets[name]  //如果长度为0 删除
      }
    }
  }

  if (this.requests[name] && this.requests[name].length) {
    // If we have pending requests and a socket gets closed a new one
    // 如果我们有挂起的请求，并且一个套接字被关闭一个新的
    // needs to be created to take over in the pool for the one that closed.
    // 需要创建要在池中接管关闭的一个池。
    this.createSocket(name, host, port).emit('free') // 发射event事件，传递若干可选参数到事件监听器的参数表 'free'
  }
}

function ForeverAgentSSL (options) {
  ForeverAgent.call(this, options)   // call 调用一个对象的一个方法，以另一个对象替换当前对象
  // 调用 ForeverAgent 方法 ,以 this 对象替换当前对象, 
}
util.inherits(ForeverAgentSSL, ForeverAgent) // 实现对象间原型继承的函数，确定继承关系，ForeverAgentSSL继承ForeverAgent 

ForeverAgentSSL.prototype.createConnection = createConnectionSSL
//给ForeverAgentSSL封装一个新方法，createConnectionSSL
ForeverAgentSSL.prototype.addRequestNoreuse = AgentSSL.prototype.addRequest
//给ForeverAgentSSL封装一个新方法，为AgentSSL.prototype.addRequest
function createConnectionSSL (port, host, options) {
//options :<Object> 包含连接详情的选项
//port:
//host:
  if (typeof port === 'object') {
    options = port;         //port数据类型等于 object，执行此条
  } else if (typeof host === 'object') {
    options = host;         //host 数据类型 等于 object ，执行此条
  } else if (typeof options === 'object') {
    options = options;      //options 数据类型 等于 object，执行此条
  } else {
    options = {};   //为空
  }

  if (typeof port === 'number') {
    options.port = port;   //port数据类型 为 number，执行此条
  }

  if (typeof host === 'string') {
    options.host = host;   // host数据类型 为 string， 执行此条
  }

  return tls.connect(options);  //返回参数
}
