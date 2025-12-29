# SubVault VPS 快速启动指南

## 5 分钟快速部署

### 第 1 步：准备 VPS

```bash
# SSH 连接到 VPS
ssh root@your-vps-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 第 2 步：上传项目

```bash
# 在本地执行
scp -r /path/to/subvault root@your-vps-ip:/opt/

# 或使用 Git
ssh root@your-vps-ip
cd /opt
git clone https://github.com/your-repo/subvault.git
cd subvault
```

### 第 3 步：配置和启动

```bash
# 进入项目目录
cd /opt/subvault

# 配置环境变量
cp .env.example .env
nano .env
# 填入 GEMINI_API_KEY

# 赋予脚本执行权限
chmod +x deploy-vps.sh

# 运行部署脚本
./deploy-vps.sh
```

### 第 4 步：验证服务

```bash
# 查看服务状态
docker-compose ps

# 测试后端
curl http://localhost:18080

# 查看日志
docker-compose logs -f
```

### 第 5 步：配置域名（可选）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请 SSL 证书
sudo certbot certonly --standalone -d your-domain.com

# 配置 Nginx
sudo cp nginx-reverse-proxy.conf /etc/nginx/sites-available/subvault
# 编辑配置文件，替换 your-domain.com
sudo nano /etc/nginx/sites-available/subvault

# 启用配置
sudo ln -s /etc/nginx/sites-available/subvault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 访问应用

| 方式 | 地址 |
|------|------|
| 直接 IP | http://your-vps-ip:13000 |
| 域名 HTTP | http://your-domain.com |
| 域名 HTTPS | https://your-domain.com |

## 常见问题

### Q: 如何查看实时日志？
```bash
docker-compose logs -f
```

### Q: 如何重启服务？
```bash
docker-compose restart
```

### Q: 如何停止服务？
```bash
docker-compose down
```

### Q: 如何备份数据？
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz ./back/data/
```

### Q: 如何更新代码？
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

### Q: 端口被占用怎么办？
```bash
# 查看占用情况
netstat -tuln | grep -E '18080|13000'

# 修改 docker-compose.yml 中的端口映射
nano docker-compose.yml
```

## 监控命令

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 查看数据库大小
du -sh ./back/data/

# 查看容器日志大小
docker inspect -f='{{.LogPath}}' subvault-backend
```

## 安全建议

1. **更改 SSH 端口**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # 修改 Port 22 为其他端口
   sudo systemctl restart ssh
   ```

2. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **定期备份**
   ```bash
   # 添加到 crontab
   crontab -e
   # 0 2 * * * cd /opt/subvault && tar -czf ./backups/backup-$(date +\%Y\%m\%d).tar.gz ./back/data/
   ```

4. **更新依赖**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

## 获取帮助

- 查看完整部署指南: `cat VPS-DEPLOYMENT.md`
- 查看 Docker 配置: `cat docker-compose.yml`
- 查看 Nginx 配置: `cat nginx-reverse-proxy.conf`
- 查看部署脚本: `cat deploy-vps.sh`
