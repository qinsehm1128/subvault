# SubVault Backend

Go 后端 API 服务，用于存储用户订阅和凭证数据。

## 技术栈

- Go 1.21+
- Gin (Web 框架)
- GORM (ORM)
- SQLite (数据库)
- JWT (认证)

## 快速开始

### 1. 安装依赖

```bash
cd back
go mod tidy
```

### 2. 运行服务

```bash
go run main.go
```

服务将在 `http://localhost:8080` 启动。

### 3. 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 8080 |
| `JWT_SECRET` | JWT 密钥 | subvault-dev-secret... |
| `DATABASE_PATH` | 数据库路径 | ./data/subvault.db |
| `ENV` | 环境 | development |

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/login` | 用户登录 |

### 用户 (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/profile` | 获取用户信息 |

### Vault (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/vault` | 获取完整 Vault 数据 |

### 订阅 (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/subscriptions` | 获取所有订阅 |
| POST | `/api/v1/subscriptions` | 创建订阅 |
| PUT | `/api/v1/subscriptions/:id` | 更新订阅 |
| DELETE | `/api/v1/subscriptions/:id` | 删除订阅 |

### 凭证 (需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/credentials` | 获取所有凭证 |
| POST | `/api/v1/credentials` | 创建凭证 |
| PUT | `/api/v1/credentials/:id` | 更新凭证 |
| DELETE | `/api/v1/credentials/:id` | 删除凭证 |

## 请求示例

### 注册

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123456"}'
```

### 登录

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "123456"}'
```

### 获取 Vault (需 Token)

```bash
curl http://localhost:8080/api/v1/vault \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 创建订阅

```bash
curl -X POST http://localhost:8080/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Netflix",
    "cost": 15.99,
    "currency": "USD",
    "frequencyAmount": 1,
    "frequencyUnit": "MONTHS",
    "startDate": "2024-01-01",
    "renewalDate": "2024-02-01",
    "category": "娱乐"
  }'
```

## 目录结构

```
back/
├── main.go                 # 入口
├── go.mod                  # 依赖
├── internal/
│   ├── config/            # 配置
│   ├── database/          # 数据库
│   ├── handlers/          # 处理器
│   ├── middleware/        # 中间件
│   ├── models/            # 数据模型
│   └── router/            # 路由
└── data/                  # SQLite 数据库文件
```
