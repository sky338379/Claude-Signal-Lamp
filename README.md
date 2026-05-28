# Claude Signal Lamp

[English](README.md) | [中文](README.zh-CN.md)

Desktop floating traffic light that shows Claude Code's working status in real-time.

## Features

- 🟢 **Green light flashing**: Task complete / brief idle
- 🟡 **Yellow light on**: Thinking / working / calling tools
- 🔴 **Red light flashing**: Awaiting permission / idle for 1 min triggers Notification hook

## Highlights

- Float anywhere on desktop, drag to move
- Minimize to system tray
- Always on top
- Switch between vertical/horizontal layout
- One-click launch script

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)

After installing Node.js, run in the project directory:

```bash
npm install
```

This will automatically install the Electron dependency (~100MB on first run).

### Project Setup

- Download or clone the entire project folder to your computer.

## Usage

### Launch

Double-click `start.bat` in the project folder to start (automatically starts bridge and floating lamp).

### Tray Menu

Right-click the tray icon:

- **Show / Hide**: Show/hide the floating lamp
- **Reset**: Reset status to green
- **Horizontal / Vertical**: Switch layout orientation
- **Exit**: Quit the app (auto-closes bridge)

### Status Reference

| Status | Light | Trigger |
|--------|-------|---------|
| Idle | 🟢 Green flashing | Task complete or briefly idle |
| Working | 🟡 Yellow on | Thinking, working |
| Confirm needed | 🔴 Red flashing | Awaiting permission / idle >1 min |

## Architecture

```
Claude Code hooks → hook-client.mjs → TCP → tcp-bridge.mjs → Status file → Electron reads
```

- **hook-client.mjs**: Fire-and-forget TCP client, sends status to bridge
- **tcp-bridge.mjs**: Persistent TCP server, receives status and writes to file
- **main.cjs**: Electron main process, reads status file and updates UI
- **index.html**: Floating lamp UI

## Configuration

### Claude Code Hooks

Hooks are configured in `~/.claude/settings.json` (user-level), applies to all Claude Code windows:

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

### Hook Events

| Event | Status | Description |
|-------|--------|-------------|
| UserPromptSubmit | thinking | User sends a message |
| PreToolUse | thinking | Before tool execution |
| PostToolUse | thinking | After tool execution |
| Stop | idle | Claude Code stops responding |
| Notification | confirm | Awaiting permission |

### Status File

Status file at `~/.claude/signal-lamp-status.json`:

```json
{
  "status": "idle",
  "message": "Idle"
}
```

Valid status values: `idle`, `processing`, `confirm`, `error`

## Manual Testing

```bash
# Test hook client
node hook-client.mjs thinking
node hook-client.mjs idle
node hook-client.mjs confirm

# Start bridge
npm run bridge

# Start floating lamp
npm start
```

## File Structure

```
signal-lamp/
├── main.cjs           # Electron main process
├── index.html         # Floating lamp UI
├── hook-client.mjs    # Hook client (sends status)
├── tcp-bridge.mjs     # TCP Bridge (receives status)
├── start.bat          # One-click launch script
├── package.json       # Project config
└── README.md          # Documentation
```

## Known Issues

- Idle for ~1 min triggers Notification hook, causing red light to flash (Claude Code behavior)

## License

MIT
