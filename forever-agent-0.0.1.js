module.exports = ForeverAgent
//模块的输出就是exports,exports是module的属性,对外暴露变量为函数ForeverAgent
ForeverAgent.SSL = ForeverAgentSSL     
//对ForeverAgent进行SSL加密

var util = require('util') 
//引入util模块
//util 是一个 Node.js 核心模块，提供常用函数的集合，用于弥补核心 Javascript 功能过于精简的不足
//在 JavaScript 代码中可以直接使用全局函数 require() 来加载一个模块
//require() 方法的返回值是该模块所暴露出来的公开 JavaScript 对象，包含了可供使用的方法和属性
//一般是直接把 require() 方法的返回值赋值给一个变量，在 JavaScript 代码中直接使用此变量即可
  , Agent = require('http').Agent      
//定义Agent变量，把 require('http').Agent 的返回值赋值给它
//加载系统预置的 http 模块的Agent属性
//引入http模块的Agent
  , net = require('net')
//引入net模块
//关与 TCP 协议相的实现在 net 模块中
  , tls = require('tls')              
//引入tls模块
//模块 tls 可以实现安全的套接字连接（SSL）
  , AgentSSL = require('https').Agent 
//Agent进行SSL加密
  
function getConnectionName(host, port) {  
//为请求选项的集合获取一个唯一的名称，用来判断一个连接是否可以被复用。 
//对于 HTTP 代理，返回 host:port:localAddress 或 host:port:localAddress:family
//host <string> 请求发送至的服务器的域名或 IP 地址。
//port <number> 远程服务器的端口。
//如果想连接到一个已有的 TCP 服务器的话，可以使用 createConnection(port, host) 方法来连接到指定主机 host 的端口 port 上
//该方法的返回值是 Socket 类的实例，表示一个套接字连接
  var name = ''                            
  //定义name属性
  if (typeof host === 'string') {           
    name = host + ':' + port
    //如果host的数据类型等于字符串
    //执行此条命令
  } else {
    // For node.js v012.0 and iojs-v1.5.1, host is an object. And any existing localAddress is part of the connection name.
    //对于node . js v012.0和iojs -v1.5.1，主机(host)是一个对象。并且任何现有的localaddress都是连接名称的一部分。
    name = host.host + ':' + host.port + ':' + (host.localAddress ? (host.localAddress + ':') : ':')
    //localAddress <string> 当发送请求时，为网络连接绑定的本地接口。
    //host.localAddress如果是true执行 host.localAddress + ':'
    //false执行':'
  }
  return name
  //返回name
}    

function ForeverAgent(options) {
//构造函数，创建 ForeverAgent，参数为options
  var self = this
  //定义self
  //在自定义函数中，this对象指向的是调用这个函数的对象，也就是说，this指向的是调用执行环境的那个对象。
  //为了在内部函数能使用外部函数的this对象，要给它赋值了一个名叫self的变量
  self.options = options || {} 
  //OPTIONS方法是用于请求获得由Request-URI标识的资源在请求/响应的通信过程中可以使用的功能选项。\
  //self的options，管道连接options与空
  self.requests = {}  
  //返回一个对象，包含还未被分配到 socket 的请求队列。 不要修改。
  self.sockets = {}  
  //返回一个对象，包含当前正被代理使用的 socket 数组。 不要修改。
  self.freeSockets = {}  
  //返回一个对象，包含当前正在等待被启用了 keepAlive 的代理使用的 socket 数组。 不要修改该属性
  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets
  //self.maxSockets:默认为不限制。 该属性可设置代理为每个来源打开的并发 socket 的最大数量。 来源是 agent.getName() 的返回值。
  //
  self.minSockets = self.options.minSockets || ForeverAgent.defaultMinSockets
  //该属性可设置代理为每个来源打开的并发 socket 的最小数量
  self.on('free', function(socket, host, port) {
  //
    var name = getConnectionName(host, port)
//
    if (self.requests[name] && self.requests[name].length) {
      self.requests[name].shift().onSocket(socket)
    } else if ( self.sockets[name] && self.sockets[name].length < self.minSockets) {
      if (!self.freeSockets[name]) self.freeSockets[name] = []
      self.freeSockets[name].push(socket)
      
      // if an error happens while we don't use the socket anyway, meh, throw the socket away
      //如果在我们不使用套接字时发生错误，meh，将套接字丢弃
      var onIdleError = function() {
        socket.destroy()
        //destroy:销毁当前正被代理使用的任何 socket
      }
      socket._onIdleError = onIdleError
      socket.on('error', onIdleError)
    } else {
      // If there are no pending requests just destroy the
      //如果没有挂起的请求，只销毁
      // socket and it will get removed from the pool. This
      //套接字，它将从池中删除。这
      // gets us out of timeout issues and allows us to
      //使我们摆脱超时问题，并允许我们
      // default to Connection:keep-alive.
      //默认连接: keep-alive
      socket.destroy()
      //destroy:销毁当前正被代理使用的任何 socket
    }
  })

}
util.inherits(ForeverAgent, Agent)
//util.inherits(constructor, superConstructor)是一个实现对象间原型继承 的函数
ForeverAgent.defaultMinSockets = 5


ForeverAgent.prototype.createConnection = net.createConnection
//agent.createConnection(options[, callback]) 创建一个用于 HTTP 请求的 socket 或流
//关与 TCP 协议相的实现在 net 模块中
ForeverAgent.prototype.addRequestNoreuse = Agent.prototype.addRequest
ForeverAgent.prototype.addRequest = function(req, host, port) {
  var name = getConnectionName(host, port)
  //agent.getName(options) 为请求选项的集合获取一个唯一的名称，用来判断一个连接是否可以被复用。 
  if (typeof host !== 'string') { //如果host的数据结构 不等于 字符型
    var options = host  //定义option，把host赋值于它
    port = options.port
    host = options.host
  }

  if (this.freeSockets[name] && this.freeSockets[name].length > 0 && !req.useChunkedEncodingByDefault) {
    var idleSocket = this.freeSockets[name].pop()
    idleSocket.removeListener('error', idleSocket._onIdleError)
    delete idleSocket._onIdleError
    req._reusedSocket = true
    req.onSocket(idleSocket)
  } else {
    this.addRequestNoreuse(req, host, port)
  }
}

ForeverAgent.prototype.removeSocket = function(s, name, host, port) {
  if (this.sockets[name]) {
    var index = this.sockets[name].indexOf(s)
    if (index !== -1) {
      this.sockets[name].splice(index, 1)
    }
  } else if (this.sockets[name] && this.sockets[name].length === 0) {
    // don't leak
    delete this.sockets[name]
    delete this.requests[name]
  }
  
  if (this.freeSockets[name]) {
    var index = this.freeSockets[name].indexOf(s)
    if (index !== -1) {
      this.freeSockets[name].splice(index, 1)
      if (this.freeSockets[name].length === 0) {
        delete this.freeSockets[name]
      }
    }
  }

  if (this.requests[name] && this.requests[name].length) {
    // If we have pending requests and a socket gets closed a new one
    // needs to be created to take over in the pool for the one that closed.
    this.createSocket(name, host, port).emit('free')
  }
}

function ForeverAgentSSL (options) {
  ForeverAgent.call(this, options)
}
util.inherits(ForeverAgentSSL, ForeverAgent)

ForeverAgentSSL.prototype.createConnection = createConnectionSSL
ForeverAgentSSL.prototype.addRequestNoreuse = AgentSSL.prototype.addRequest

function createConnectionSSL (port, host, options) {
  if (typeof port === 'object') {
    options = port;
  } else if (typeof host === 'object') {
    options = host;
  } else if (typeof options === 'object') {
    options = options;
  } else {
    options = {};
  }

  if (typeof port === 'number') {
    options.port = port;
  }

  if (typeof host === 'string') {
    options.host = host;
  }

  return tls.connect(options);
}
