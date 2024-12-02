#!/bin/bash

# 使用ps命令查找所有名为node的进程
# -ef 选项表示列出所有进程
# grep 'node' 用于筛选出包含'node'的行
# awk '{print $2}' 用于提取进程ID（PID）

# 存储找到的node进程的PID
pids=$(ps -ef | grep 'node server.js' |grep -v sh| awk '{print $2}')

# 检查是否找到进程
if [ -z "$pids" ]; then
    echo "没有找到名为node的进程。"
    exit 1
fi

# 遍历所有找到的PID，并发送SIGTERM信号
for pid in $pids; do
    echo "正在终止进程ID：$pid"
    kill -9 $pid
done

echo "进程重启完成"