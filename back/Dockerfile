FROM golang:1.21-alpine AS builder

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 编译
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o subvault .

# 最终镜像
FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite-libs

WORKDIR /app

# 从 builder 阶段复制编译好的二进制文件
COPY --from=builder /app/subvault .

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 8080

CMD ["./subvault"]
