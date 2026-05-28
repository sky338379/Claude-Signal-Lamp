#!/usr/bin/env node
// TCP 服务：接收 hook-client 的状态，写入状态文件供 Electron 读取

import net from 'node:net'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const port = Number(process.env.CLAUDE_LIGHT_PORT ?? 8765)
const statusFile = path.join(os.homedir(), '.claude', 'signal-lamp-status.json')

// 状态映射
const STATE_MAP = {
  idle: { status: 'idle', message: '空闲' },
  thinking: { status: 'processing', message: '工作中' },
  running: { status: 'processing', message: '工作中' },
  confirm: { status: 'confirm', message: '需要确认' },
  error: { status: 'error', message: '错误' },
}

// 确保目录存在
const dir = path.dirname(statusFile)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeStatus(state) {
  const data = STATE_MAP[state] ?? STATE_MAP.idle
  fs.writeFileSync(statusFile, JSON.stringify(data, null, 2))
  console.log(`${new Date().toLocaleTimeString()} -> ${state} (${data.message})`)
}

const server = net.createServer((socket) => {
  socket.setEncoding('utf8')
  let buffer = ''

  socket.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const state = line.trim()
      if (state) writeStatus(state)
    }
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Signal lamp bridge listening on 127.0.0.1:${port}`)
  writeStatus('idle')
})

process.on('SIGINT', () => {
  writeStatus('idle')
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  writeStatus('idle')
  server.close()
  process.exit(0)
})