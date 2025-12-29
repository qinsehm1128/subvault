FROM golang:1.21-bookworm AS builder

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 编译
RUN CGO_ENABLED=1 go build -o subvault .

# 最终镜像
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从 builder 阶段复制编译好的二进制文件
COPY --from=builder /app/subvault .

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["./subvault"]
