#!/bin/sh

# 启动后端服务（后台）
PORT=8080 /app/subvault &

# 启动 Caddy（前台，保持容器运行）
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
