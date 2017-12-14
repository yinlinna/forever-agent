# 项目解读

http代理，它将套接字连接保持在keep-alive请求之间。以前是mikeal /request的一部分，现在是一个独立模块。

## Source
[forever-agent.js 源码](https://github.com/request/forever-agent/blob/master/index.js)

[forever-agent.js 源码解读全文注释版](https://github.com/yinlinna/forever-agent/blob/master/forever-agent-0.0.1.js)

## 项目名称

forever-agent

## 项目类型

web网页

## 项目功能

是建立了tcp连接后仍然保持keep-alive，以便下次再请求的时候，可以不用浪费握手的时间

## 入口文件

ForeverAgent

## 项目依赖模块

- util：util 是一个 Node.js 核心模块，提供常用函数的集合

- Agent：http服务的代理

- net：TCP 协议相关的实现

- tls ：模块 tls 可以实现安全的套接字连接（SSL）

- AgentSSL：https服务的代理,安全加密

> ### HTTP代理

www连接请求采用的http协议，所以我们在浏览网页，下载数据（也可采用ftp协议）时就是用http代理。它通常绑定在代理服务器的80、3128、8080等端口上。

> ### 套接字

**是支持TCP/IP的网络通信的基本操作单元**，可以看做是不同主机之间的进程进行双向通信的端点，简单的说就是通信的两方的一种约定，用套接字中的相关函数来完成通信过程。
- 举例说明下：Socket=Ip address+ TCP/UDP + port。

> ### keep-alive

是建立了tcp连接后仍然保持，以便下次再请求的时候，可以不用浪费握手的时间。














