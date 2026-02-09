#!/bin/bash
# Claude Code 临时文件清理工具 (Bash)
# 用法: ./cleanup.sh [目录路径]
#       不指定目录则从当前目录开始清理

TARGET_DIR="${1:-.}"

echo "========================================"
echo "Claude Code 临时文件清理工具"
echo "========================================"
echo ""
echo "清理目录: $TARGET_DIR"
echo ""

count=0

# 删除匹配的文件
while IFS= read -r file; do
    rm -f "$file"
    ((count++))
done < <(find "$TARGET_DIR" -type f -name "tmpclaude-*-cwd" 2>/dev/null)

# 删除匹配的目录（以防某些情况下是目录）
while IFS= read -r dir; do
    rm -rf "$dir"
    ((count++))
done < <(find "$TARGET_DIR" -type d -name "tmpclaude-*-cwd" 2>/dev/null)

echo "已删除 $count 个临时文件"
echo "========================================"
