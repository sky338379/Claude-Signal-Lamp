# Claude Signal Lamp

[English](README.md) | [中文](README.zh-CN.md)

桌面悬浮红绿灯，实时指示 Claude Code 的工作状态。

## 功能

- 🟢 **绿灯闪烁**：任务完成 / 短暂空闲
- 🟡 **黄灯常亮**：思考中 / 工作中 / 调用工具中
- 🔴 **红灯闪烁**：需要确认权限 / 空闲一分钟触发 Notification hook

## 特性

- 悬浮在桌面任意位置，可拖拽移动
- 最小化到系统托盘
- 始终置顶显示
- 支持横竖布局切换
- 一键启动脚本

## 安装

### 前置条件

- [Node.js](https://nodejs.org/)（自带 npm）

安装 Node.js 后，在项目目录执行：

```bash
npm install
```

这会自动安装 Electron 依赖（首次约 100MB）。

### 项目本体安装

- 需将整个项目文件夹保存至计算机中。

## 使用方式

### 启动

双击项目文件夹下的 `start.bat` 即可启动（自动启动 bridge 和悬浮灯）。

### 托盘菜单

右键托盘图标：

- **Show / Hide**：显示/隐藏悬浮灯
- **Reset**：重置状态为绿灯
- **Horizontal / Vertical**：切换横竖布局
- **Exit**：退出应用（自动关闭 bridge）

### 状态说明

| 状态 | 灯光 | 触发时机 |
|------|------|----------|
| 空闲 | 🟢 绿灯闪烁 | 任务完成或短暂空闲中 |
| 工作中 | 🟡 黄灯常亮 | 思考中、工作中 |
| 需要确认 | 🔴 红灯闪烁 | 需要用户确认权限/空闲超1分钟 |

## 架构

```
Claude Code hooks → hook-client.mjs → TCP → tcp-bridge.mjs → 状态文件 → Electron 读取
```

- **hook-client.mjs**：即发即忘的 TCP 客户端，发送状态到 bridge
- **tcp-bridge.mjs**：常驻 TCP 服务，接收状态并写入文件
- **main.cjs**：Electron 主进程，读取状态文件并更新 UI
- **index.html**：悬浮灯 UI

## 配置

### Claude Code Hooks

hooks 配置在 `~/.claude/settings.json`（用户级），所有 Claude Code 窗口都会生效：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node D:/code/claude/signal-lamp/hook-client.mjs thinking"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node D:/code/claude/signal-lamp/hook-client.mjs thinking"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node D:/code/claude/signal-lamp/hook-client.mjs thinking"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node D:/code/claude/signal-lamp/hook-client.mjs idle"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node D:/code/claude/signal-lamp/hook-client.mjs confirm"
          }
        ]
      }
    ]
  }
}
```

### Hook 事件说明

| 事件 | 状态 | 说明 |
|------|------|------|
| UserPromptSubmit | thinking | 用户发送消息 |
| PreToolUse | thinking | 工具调用前 |
| PostToolUse | thinking | 工具调用后 |
| Stop | idle | Claude Code 停止响应 |
| Notification | confirm | 需要确认权限 |

### 状态文件

状态文件位于 `~/.claude/signal-lamp-status.json`，格式：

```json
{
  "status": "idle",
  "message": "空闲"
}
```

可选状态值：`idle`、`processing`、`confirm`、`error`

## 手动测试

```bash
# 测试 hook 客户端
node hook-client.mjs thinking
node hook-client.mjs idle
node hook-client.mjs confirm

# 启动 bridge
npm run bridge

# 启动悬浮灯
npm start
```

## 文件说明

```
signal-lamp/
├── main.cjs           # Electron 主进程
├── index.html         # 悬浮灯 UI
├── hook-client.mjs    # Hook 客户端（发送状态）
├── tcp-bridge.mjs     # TCP Bridge（接收状态）
├── start.bat          # 一键启动脚本
├── package.json       # 项目配置
└── README.md          # 说明文档
```

## 已知问题

- **红灯延迟**：弹出权限确认框后，红灯大约有 5 秒延迟才会亮起。这是因为 Claude Code 的 Notification hook 触发时机导致的，我们无法控制。
- **空闲触发红灯**：空闲约一分钟后会触发 Notification hook，导致红灯闪烁（Claude Code 行为）。

## 许可证

MIT
