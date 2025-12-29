# ==================== 后端编译 ====================
FROM golang:1.21-bookworm AS backend-builder

WORKDIR /app

COPY back/go.mod back/go.sum ./
RUN go mod download

COPY back/ .
RUN CGO_ENABLED=1 go build -ldflags='-s -w' -o subvault .

# ==================== 前端编译 ====================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY fed/package*.json ./
RUN npm ci

COPY fed/ .
RUN npm run build

# ==================== 最终镜像 ====================
FROM debian:bookworm-slim

# 安装 nginx 和 supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制后端二进制
COPY --from=backend-builder /app/subvault .

# 复制前端静态文件
COPY --from=frontend-builder /app/dist /var/www/html

# 复制配置文件
COPY deploy/nginx.conf /etc/nginx/sites-available/default
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
