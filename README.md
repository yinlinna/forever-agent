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














