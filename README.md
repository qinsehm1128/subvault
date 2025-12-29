# SubVault

订阅管理与密码保险箱，帮助你追踪订阅服务和管理账号凭证。

## 功能

### 订阅管理
- 记录订阅服务名称、费用、货币类型
- 支持多种计费周期：按天/周/月/年/永久
- 自动计算下次续费日期
- 订阅分类管理（娱乐、工具、生活等）
- 关联账号凭证，快速查看登录信息
- 续费周期进度可视化，临期提醒

### 凭证保险箱
- 安全存储账号密码
- 支持添加备注信息
- 批量导入凭证
- 与订阅服务关联

### 数据分析
- 月度/年度支出统计
- 分类支出占比饼图
- 月度支出趋势折线图
- 多货币支出分布
- 即将到期订阅统计

### AI 智能助手
- 对话式订阅分析
- 自动生成财务审计报告
- 消费结构分析
- 个性化省钱建议
- 支持流式响应
- 历史报告存档

### 系统设置
- 自定义标签管理
- 到期提醒配置（支持多天提前提醒）
- 数据导出功能

## 技术栈

- 后端：Go + Gin + SQLite
- 前端：React + TypeScript + Vite

## 部署

```bash
git clone https://github.com/your-repo/subvault.git
cd subvault

# 生产环境：配置环境变量
cp .env.production.example .env
# 编辑 .env 填入 JWT_SECRET 和 ENCRYPTION_KEY

# 启动服务
docker-compose up -d
```

访问 http://your-ip:13000

## 安全配置

生产环境必须设置以下环境变量：

```bash
# 生成随机密钥
openssl rand -hex 32

# .env 文件
JWT_SECRET=<32字符以上的随机字符串>
ENCRYPTION_KEY=<32字符以上的随机字符串>
```

敏感数据（密码、API 密钥）使用 AES-256-GCM 加密存储。

## 端口

| 服务 | 端口 |
|------|------|
| 前端 | 13000 |
| 后端 | 18080 |

## 常用命令

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose up -d --build
```

## 数据

数据库文件位于 `back/data/subvault.db`，建议定期备份。
