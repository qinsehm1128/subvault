# ==================== 后端编译 ====================
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

COPY back/go.mod back/go.sum ./
RUN go mod download

COPY back/ .
RUN CGO_ENABLED=0 go build -ldflags='-s -w' -o subvault .

# ==================== 前端编译 ====================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY fed/package*.json ./
RUN npm ci

COPY fed/ .
RUN npm run build

# ==================== 最终镜像（caddy:alpine 已预装 Caddy）====================
FROM caddy:alpine

WORKDIR /app

# 复制后端二进制
COPY --from=backend-builder /app/subvault .

# 复制前端静态文件
COPY --from=frontend-builder /app/dist /var/www/html

# 复制 Caddy 配置
COPY deploy/Caddyfile /etc/caddy/Caddyfile

# 复制启动脚本
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 80

ENTRYPOINT ["/app/entrypoint.sh"]
