---
name: cleanup-ws
description: Remove Claude Code temporary files (tmpclaude-*-cwd). Use when user asks to clean temp files, CWD files, or mentions "cleanup", "清理临时文件", "清理 tmpclaude", "清理 CWD".
---

# Workspace Cleanup

Remove Claude Code temporary files (tmpclaude-*-cwd) recursively.

> **Important:** `tmpclaude-*-cwd` are **files**, not directories.

## Usage

When triggered, immediately execute:

**Windows (PowerShell - recommended):**
```bash
powershell.exe -ExecutionPolicy Bypass -File "C:\Users\Administrator\.claude\skills\cleanup-ws\scripts\cleanup.ps1" "TARGET_DIR"
```

**Windows (Batch - fallback):**
```bash
cmd /c "C:\Users\Administrator\.claude\skills\cleanup-ws\scripts\cleanup.bat" "TARGET_DIR"
```

**Linux/macOS:**
```bash
bash "C:\Users\Administrator\.claude\skills\cleanup-ws\scripts\cleanup.sh" "TARGET_DIR"
```

**Default directory:** `E:\workspace` (if user doesn't specify)

## Scripts

- `scripts/cleanup.ps1` - PowerShell script (Windows, recommended)
- `scripts/cleanup.bat` - Batch script (Windows)
- `scripts/cleanup.sh` - Bash script (Linux/macOS)

## What Changed

- Fixed: Scripts now delete **files** (not directories)
- Added: PowerShell script with better error handling
- Updated: All scripts handle both files and directories for robustness
