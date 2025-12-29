#!/bin/bash

# SubVault VPS 部署脚本
# 使用方法: bash deploy-vps.sh

set -e

echo "=========================================="
echo "SubVault VPS 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要工具
check_requirements() {
    echo -e "${YELLOW}[1/6] 检查系统要求...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        echo "请访问: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        echo "请访问: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker 和 Docker Compose 已安装${NC}"
}

# 检查端口
check_ports() {
    echo -e "${YELLOW}[2/5] 检查端口可用性...${NC}"
    
    for port in 18080 13000; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${RED}❌ 端口 $port 已被占用${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✓ 端口 18080 和 13000 可用${NC}"
}

# 创建数据目录
setup_directories() {
    echo -e "${YELLOW}[3/5] 创建数据目录...${NC}"
    
    mkdir -p ./back/data
    chmod 755 ./back/data
    
    echo -e "${GREEN}✓ 数据目录已创建${NC}"
}

# 构建镜像
build_images() {
    echo -e "${YELLOW}[4/5] 构建 Docker 镜像...${NC}"
    echo "这可能需要几分钟，请耐心等待..."
    
    docker-compose build --no-cache
    
    echo -e "${GREEN}✓ 镜像构建完成${NC}"
}

# 启动服务
start_services() {
    echo -e "${YELLOW}[5/5] 启动服务...${NC}"
    
    docker-compose up -d
    
    echo -e "${GREEN}✓ 服务已启动${NC}"
    
    # 等待服务就绪
    echo -e "${YELLOW}等待服务就绪...${NC}"
    sleep 10
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ 所有服务已启动${NC}"
    else
        echo -e "${RED}❌ 服务启动失败${NC}"
        docker-compose logs
        exit 1
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}部署完成！${NC}"
    echo "=========================================="
    echo ""
    echo "📍 服务地址:"
    echo "   前端: http://your-domain.com:13000"
    echo "   后端 API: http://your-domain.com:18080"
    echo ""
    echo "📋 常用命令:"
    echo "   查看日志: docker-compose logs -f"
    echo "   停止服务: docker-compose down"
    echo "   重启服务: docker-compose restart"
    echo "   查看状态: docker-compose ps"
    echo ""
    echo "� 数据备份:"
    echo "   数据库位置: ./back/data/subvault.db"
    echo "   定期备份此目录以防数据丢失"
    echo ""
}

# 主流程
main() {
    check_requirements
    check_ports
    setup_directories
    build_images
    start_services
    show_info
}

main
