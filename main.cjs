const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

let mainWindow = null
let tray = null
let isQuitting = false
let lastStatus = null
let orientation = 'vertical' // 'vertical' or 'horizontal'

const STATUS_FILE = path.join(os.homedir(), '.claude', 'signal-lamp-status.json')

// 创建程序化图标
function createTrayIcon(color = 'green') {
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - 7.5
      const dy = y - 7.5
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 6) {
        if (color === 'green') {
          canvas[idx] = 0
          canvas[idx + 1] = 200
          canvas[idx + 2] = 0
        } else if (color === 'yellow') {
          canvas[idx] = 0
          canvas[idx + 1] = 200
          canvas[idx + 2] = 255
        } else {
          canvas[idx] = 0
          canvas[idx + 1] = 0
          canvas[idx + 2] = 255
        }
        canvas[idx + 3] = 255
      } else {
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 50,
    height: 140,
    x: width - 80,
    y: height - 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
  mainWindow.setIgnoreMouseEvents(false)

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      createTray() // 更新菜单标签
    }
  })

  mainWindow.on('show', () => {
    createTray() // 更新菜单标签
  })

  mainWindow.on('hide', () => {
    createTray() // 更新菜单标签
  })
}

function createTray() {
  // 销毁旧的托盘图标
  if (tray) {
    tray.destroy()
  }

  const icon = createTrayIcon('green')
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow && mainWindow.isVisible() ? 'Hide' : 'Show',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide()
          } else {
            mainWindow.show()
            mainWindow.focus()
          }
        }
      }
    },
    {
      label: 'Reset',
      click: () => {
        // 重置状态为绿灯
        const data = { status: 'idle', message: '空闲' }
        fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2))
        lastStatus = null
        pollStatus()
      }
    },
    {
      label: orientation === 'vertical' ? 'Horizontal' : 'Vertical',
      click: () => {
        orientation = orientation === 'vertical' ? 'horizontal' : 'vertical'
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('toggle-layout', orientation)
          // 调整窗口大小
          if (orientation === 'horizontal') {
            mainWindow.setSize(140, 50)
          } else {
            mainWindow.setSize(50, 140)
          }
        }
        // 重建菜单以更新标签
        createTray()
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true
        // 杀掉监听 8765 端口的进程（bridge）
        const { execSync } = require('child_process')
        try {
          execSync('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :8765\') do taskkill /F /PID %a', { stdio: 'ignore' })
        } catch (e) {
          // 忽略错误
        }
        app.quit()
      }
    }
  ])

  tray.setToolTip('Claude Code 状态灯')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function updateTrayIcon(color) {
  if (tray) {
    const icon = createTrayIcon(color)
    tray.setImage(icon)
  }
}

// 文件轮询检测状态变化（比 TCP 更简单可靠）
function pollStatus() {
  try {
    if (!fs.existsSync(STATUS_FILE)) return

    const content = fs.readFileSync(STATUS_FILE, 'utf8')
    const data = JSON.parse(content)
    const statusKey = `${data.status}-${data.message}`

    if (statusKey === lastStatus) return
    lastStatus = statusKey

    // 更新托盘图标
    let color = 'green'
    if (data.status === 'processing') color = 'yellow'
    if (data.status === 'error' || data.status === 'confirm') color = 'red'
    updateTrayIcon(color)

    // 通知渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', data)
    }

    // 更新托盘提示
    if (tray) {
      tray.setToolTip(`Claude Code: ${data.message || data.status}`)
    }
  } catch (e) {
    // 忽略解析错误
  }
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  // 每 100ms 检测一次状态文件变化
  setInterval(pollStatus, 100)
  pollStatus()
})

app.on('window-all-closed', () => {
  // 保持托盘运行
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})