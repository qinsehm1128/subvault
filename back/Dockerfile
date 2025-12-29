FROM golang:1.21-bookworm AS builder

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 静态编译（包含所有依赖）
RUN CGO_ENABLED=1 go build -ldflags='-s -w -extldflags "-static"' -o subvault .

# 最终镜像 - 使用最小的 scratch 或 distroless
FROM gcr.io/distroless/static-debian12

WORKDIR /app

# 从 builder 阶段复制编译好的二进制文件
COPY --from=builder /app/subvault .

# 创建数据目录需要在 builder 阶段处理，distroless 没有 shell
# 数据目录通过 volume 挂载

EXPOSE 8080

CMD ["./subvault"]
