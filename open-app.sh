#!/bin/bash
# 三年级字词学习应用 - 一键打开脚本

echo "=================================="
echo "  三年级字词学习应用"
echo "=================================="
echo ""

# 获取文件路径
APP_PATH="$(dirname "$0")/index.html"
APP_FULL_PATH="$(realpath "$APP_PATH")"

echo "应用位置: $APP_FULL_PATH"
echo ""

# 尝试方法 1: 使用默认浏览器打开文件
echo "🚀 方法 1: 直接在浏览器中打开文件..."
if command -v xdg-open &> /dev/null; then
    xdg-open "$APP_FULL_PATH" 2>/dev/null && echo "✅ 已使用默认浏览器打开" && exit 0
fi

if command -v open &> /dev/null; then
    open "$APP_FULL_PATH" 2>/dev/null && echo "✅ 已使用默认浏览器打开 (Mac)" && exit 0
fi

# 尝试方法 2: 启动 HTTP 服务器
echo "🚀 方法 2: 启动 HTTP 服务器..."

# 查找可用端口
PORT=8888
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; do
    PORT=$((PORT + 1))
done

echo "使用端口: $PORT"

# 启动服务器
cd "$(dirname "$0")"
python3 -m http.server $PORT --bind 0.0.0.0 &
SERVER_PID=$!

sleep 2

# 检查服务器
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ | grep -q "200"; then
    echo ""
    echo "✅ 服务器启动成功！"
    echo ""
    echo "=================================="
    echo "  请在浏览器中访问："
    echo "  http://localhost:$PORT/"
    echo "=================================="
    echo ""

    # 尝试自动打开浏览器
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$PORT/" 2>/dev/null
    elif command -v open &> /dev/null; then
        open "http://localhost:$PORT/" 2>/dev/null
    fi

    echo "按 Ctrl+C 停止服务器"
    wait $SERVER_PID
else
    echo "❌ 服务器启动失败"
    echo ""
    echo "请手动打开文件："
    echo "$APP_FULL_PATH"
fi
