@echo off
REM 清理 Claude Code 临时文件脚本 (Windows Batch)
REM 用法: cleanup.bat [目录路径]
REM       不指定目录则从当前目录开始清理

setlocal enabledelayedexpansion

set "TARGET_DIR=%~1"
if "%TARGET_DIR%"=="" set "TARGET_DIR=."

echo ========================================
echo Claude Code 临时文件清理工具
echo ========================================
echo.
echo 清理目录: %TARGET_DIR%
echo.

set /a count=0

REM 删除匹配的文件
for /f "delims=" %%f in ('dir /s /b "%TARGET_DIR%\tmpclaude-*-cwd" 2^>nul') do (
    del /q /f "%%f" 2>nul
    set /a count+=1
)

REM 删除匹配的目录（以防某些情况下是目录）
for /f "delims=" %%d in ('dir /s /b /ad "%TARGET_DIR%\tmpclaude-*-cwd" 2^>nul') do (
    rd /s /q "%%d" 2>nul
    set /a count+=1
)

echo 已删除 !count! 个临时文件
echo ========================================
