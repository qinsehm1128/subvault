# SubVault VPS 部署指南

## 端口配置

| 服务 | 容器内端口 | VPS 外部端口 | 说明 |
|------|-----------|------------|------|
| 后端 API | 8080 | **18080** | Go 后端服务 |
| 前端 | 3000 | **13000** | React 前端服务 |

使用高位端口 (13000+) 避免与常见服务冲突。

## 前置要求

- VPS 系统: Ubuntu 20.04+ 或 CentOS 8+
- 最低配置: 2GB RAM, 2 CPU, 20GB 存储
- 已安装 Docker 和 Docker Compose
- 域名（可选，用于生产环境）

## 快速部署

### 方式一：自动部署脚本（推荐）

```bash
# 1. 克隆或上传项目到 VPS
cd /opt/subvault

# 2. 赋予脚本执行权限
chmod +x deploy-vps.sh

# 3. 运行部署脚本
./deploy-vps.sh
```

脚本会自动：
- ✓ 检查 Docker 和 Docker Compose
- ✓ 验证端口可用性
- ✓ 配置环境变量
- ✓ 创建数据目录
- ✓ 构建 Docker 镜像
- ✓ 启动所有服务

### 方式二：手动部署

```bash
# 1. 进入项目目录
cd /opt/subvault

# 2. 复制环境变量文件
cp .env.example .env

# 3. 编辑环境变量（填入 GEMINI_API_KEY）
nano .env

# 4. 创建数据目录
mkdir -p ./back/data

# 5. 构建镜像
docker-compose build

# 6. 启动服务
docker-compose up -d

# 7. 查看日志
docker-compose logs -f
```

## 环境变量配置

编辑 `.env` 文件：

```bash
nano .env
```

必填项：
```env
# Google Gemini API 密钥（必填）
GEMINI_API_KEY=your_actual_api_key_here

# 前端 API 地址（改为你的域名或 VPS IP）
VITE_API_URL=http://your-vps-ip:18080
# 或使用域名
VITE_API_URL=https://api.your-domain.com
```

## 访问应用

### 本地 VPS 访问
```
前端: http://vps-ip:13000
后端: http://vps-ip:18080
```

### 通过域名访问（推荐）

使用 Nginx 反向代理：

```nginx
# /etc/nginx/sites-available/subvault
upstream backend {
    server localhost:18080;
}

upstream frontend {
    server localhost:13000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 后端 API
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/subvault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 完全清理（包括数据）
docker-compose down -v

# 进入容器调试
docker-compose exec backend sh
docker-compose exec frontend sh

# 查看容器资源使用
docker stats
```

## 数据备份

### 备份数据库

```bash
# 备份到本地
cp -r ./back/data ./back/data.backup.$(date +%Y%m%d)

# 或使用 tar 压缩
tar -czf subvault-backup-$(date +%Y%m%d).tar.gz ./back/data/
```

### 定期备份（Cron）

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * cd /opt/subvault && tar -czf ./backups/backup-$(date +\%Y\%m\%d).tar.gz ./back/data/
```

## 监控和维护

### 检查磁盘空间

```bash
df -h
du -sh ./back/data/
```

### 查看容器资源使用

```bash
docker stats subvault-backend subvault-frontend
```

### 更新镜像

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build --no-cache

# 重启服务
docker-compose up -d
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend

# 检查端口占用
netstat -tuln | grep -E '18080|13000'

# 检查磁盘空间
df -h
```

### 后端连接数据库失败

```bash
# 检查数据目录权限
ls -la ./back/data/

# 修复权限
chmod 755 ./back/data/
chmod 644 ./back/data/subvault.db
```

### 前端无法连接后端

```bash
# 检查 .env 中的 VITE_API_URL
cat .env | grep VITE_API_URL

# 测试后端连接
curl http://localhost:18080/health
```

### 内存不足

```bash
# 查看内存使用
free -h

# 清理 Docker 缓存
docker system prune -a

# 限制容器内存（编辑 docker-compose.yml）
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

## 生产环境建议

1. **使用 HTTPS**
   - 申请 SSL 证书（Let's Encrypt 免费）
   - 配置 Nginx 反向代理

2. **定期备份**
   - 每天自动备份数据库
   - 备份到远程存储（如 S3）

3. **监控告警**
   - 使用 Prometheus + Grafana
   - 配置磁盘空间告警

4. **日志管理**
   - 使用 ELK Stack 或 Loki
   - 定期清理旧日志

5. **安全加固**
   - 配置防火墙规则
   - 只开放必要端口
   - 定期更新系统和依赖

6. **性能优化**
   - 启用 Gzip 压缩
   - 配置 CDN
   - 使用数据库连接池

## 获取帮助

- 查看日志: `docker-compose logs -f`
- 检查配置: `cat docker-compose.yml`
- 测试连接: `curl http://localhost:18080`
