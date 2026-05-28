#!/usr/bin/env node
// Claude Code hook 调用的客户端
// 即发即忘：发送状态到本地 TCP 服务后立即退出

import net from 'node:net'

const host = '127.0.0.1'
const port = 8765
const timeoutMs = 200
const state = process.argv[2] ?? 'idle'

const socket = net.createConnection({ host, port })
const finish = () => process.exit(0)

socket.setTimeout(timeoutMs, finish)
socket.on('connect', () => {
  socket.end(`${state}\n`)
})
socket.on('error', finish)
socket.on('close', finish)