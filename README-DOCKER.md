# SubVault Docker 部署指南

## 项目结构

```
.
├── back/                    # Go 后端
│   ├── Dockerfile          # 后端 Docker 镜像配置
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   └── internal/
├── fed/                     # React 前端
│   ├── Dockerfile          # 前端 Docker 镜像配置
│   ├── nginx.conf          # Nginx 配置
│   ├── package.json
│   └── ...
├── docker-compose.yml      # Docker Compose 配置
└── .env.example            # 环境变量示例
```

## 快速开始

### 1. 准备环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 GEMINI_API_KEY
```

### 2. 构建并启动容器

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8080

## 构建详情

### 后端 (Go)

- **基础镜像**: `golang:1.21-alpine` (构建阶段) → `alpine:latest` (运行阶段)
- **编译方式**: 多阶段构建，在 Go 容器中直接编译
- **输出**: 单个二进制文件 `subvault`
- **数据库**: SQLite，持久化到 `./back/data/subvault.db`

### 前端 (React)

- **基础镜像**: `node:20-alpine` (构建阶段) → `nginx:alpine` (运行阶段)
- **构建工具**: Vite
- **Web 服务器**: Nginx
- **功能**: 
  - SPA 路由支持
  - API 代理到后端
  - 静态资源缓存

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重新构建
docker-compose build --no-cache

# 进入容器
docker-compose exec backend sh
docker-compose exec frontend sh

# 清理所有资源
docker-compose down -v
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `GEMINI_API_KEY` | Google Gemini API 密钥 | 无 |
| `PORT` | 后端服务端口 | 8080 |
| `DATABASE_PATH` | SQLite 数据库路径 | /app/data/subvault.db |
| `VITE_API_URL` | 前端 API 地址 | http://localhost:8080 |

## 生产部署建议

1. **使用环境变量管理敏感信息**
   ```bash
   docker-compose --env-file .env.production up -d
   ```

2. **配置反向代理** (如 Nginx/Traefik)
   - 处理 HTTPS
   - 负载均衡
   - 域名映射

3. **持久化存储**
   - 使用 Docker volumes 或 bind mounts
   - 定期备份数据库

4. **监控和日志**
   ```bash
   docker-compose logs --tail=100 -f
   ```

5. **资源限制**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
   ```

## 故障排查

### 后端无法启动
```bash
docker-compose logs backend
# 检查数据库路径和权限
```

### 前端无法连接后端
```bash
# 检查 nginx.conf 中的代理配置
# 确保 VITE_API_URL 正确
```

### 端口被占用
```bash
# 修改 docker-compose.yml 中的端口映射
# 或者停止占用端口的其他服务
```
