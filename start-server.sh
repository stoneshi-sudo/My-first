#!/bin/bash
# 三年级字词学习应用 - 启动脚本

# 默认端口
PORT=${1:-3000}

echo "=================================="
echo "  三年级字词学习应用 启动中...  "
echo "=================================="
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  端口 $PORT 已被占用"
    echo "正在尝试清理..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

# 启动服务器
echo "🚀 启动服务器在端口 $PORT..."
cd "$(dirname "$0")"
python3 -m http.server $PORT &

# 等待服务器启动
sleep 2

# 检查服务器状态
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ | grep -q "200"; then
    echo ""
    echo "✅ 服务器启动成功！"
    echo ""
    echo "=================================="
    echo "  访问地址："
    echo "  http://localhost:$PORT/"
    echo "  http://127.0.0.1:$PORT/"
    echo "=================================="
    echo ""
    echo "💡 提示：按 Ctrl+C 停止服务器"
    echo ""
else
    echo ""
    echo "❌ 服务器启动失败"
    echo "请检查端口 $PORT 是否可用"
fi

# 保持脚本运行
wait
