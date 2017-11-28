module.exports = ForeverAgent
//模块的输出就是exports,exports是module的属性,对外暴露变量为函数ForeverAgent
ForeverAgent.SSL = ForeverAgentSSL
//对ForeverAgent进行SSL加密

var util = require('util')
//引入util模块
  , Agent = require('http').Agent
  //引入http模块的Agent
  , net = require('net')
  //引入net模块
  , tls = require('tls')
  //引入tls模块
  , AgentSSL = require('https').Agent
  //Agent进行SSL加密
  
function getConnectionName(host, port) {  
//构造函数getConnectionName，参数为host,port
  var name = ''
  //引入name属性
  if (typeof host === 'string') {
  //如果 host的数据类型 等于 字符串
    name = host + ':' + port
    //执行此条命令
  } else {
  //否则
    // For node.js v012.0 and iojs-v1.5.1, host is an object. And any existing localAddress is part of the connection name.
    name = host.host + ':' + host.port + ':' + (host.localAddress ? (host.localAddress + ':') : ':')
    //执行此条命令
  }
  return name
  //返回name
}    

function ForeverAgent(options) {
//构造函数FeverAgent
  var self = this
  //定义self
  self.options = options || {} //self的options，管道连接options与空
  self.requests = {}  //self的requests
  self.sockets = {}  //self的sockets
  self.freeSockets = {}  //self的freeSockets
  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets
  //self.maxSockets 是 self.options.maxSockets 管道连接 Agent.defaultMaxSockets
  self.minSockets = self.options.minSockets || ForeverAgent.defaultMinSockets
  //self.minSockets 是 self.options.minSockets 管道连接 ForeverAgent.defaultMinSockets
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
      var onIdleError = function() {
        socket.destroy()
      }
      socket._onIdleError = onIdleError
      socket.on('error', onIdleError)
    } else {
      // If there are no pending requests just destroy the
      // socket and it will get removed from the pool. This
      // gets us out of timeout issues and allows us to
      // default to Connection:keep-alive.
      socket.destroy()
    }
  })

}
util.inherits(ForeverAgent, Agent)

ForeverAgent.defaultMinSockets = 5


ForeverAgent.prototype.createConnection = net.createConnection
ForeverAgent.prototype.addRequestNoreuse = Agent.prototype.addRequest
ForeverAgent.prototype.addRequest = function(req, host, port) {
  var name = getConnectionName(host, port)
  
  if (typeof host !== 'string') {
    var options = host
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
