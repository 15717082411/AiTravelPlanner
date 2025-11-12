# Docker 镜像构建与部署指南

本文档说明如何使用 GitHub Actions 将项目打包成 Docker 镜像并推送到阿里云镜像仓库。

## 前置准备

### 1. 阿里云容器镜像服务配置

#### 1.1 创建命名空间和镜像仓库

1. 登录 [阿里云容器镜像服务控制台](https://cr.console.aliyun.com/)
2. 在左侧导航栏选择「实例列表」，点击您的目标实例（如果没有实例，需要先创建）
3. 创建命名空间（如果还没有）：
   - 进入「命名空间」页面
   - 点击「创建命名空间」
   - 输入命名空间名称（如：`ai-travel-planner`）
4. 在命名空间中创建两个镜像仓库：
   - `ai-travel-planner-backend`（后端）
   - `ai-travel-planner-frontend`（前端）

#### 1.2 获取访问凭证（用户名和密码）

**查看和设置登录密码：**

1. 在容器镜像服务控制台，进入「实例列表」→ 选择您的实例
2. 在实例管理页面，选择「访问凭证」标签页
3. 在「访问凭证」页面，您可以：
   - **设置固定密码**：点击「设置固定密码」，设置一个固定密码（推荐用于 CI/CD）
   - **查看临时密码**：如果已设置，可以查看临时密码（有效期 24 小时）

**获取用户名：**

- **主账号登录**：用户名就是您的阿里云账号全名（通常是邮箱或手机号）
- **RAM 子账号登录**：用户名格式为 `RAM用户名@企业别名`
  - RAM 用户名：在 RAM 控制台查看
  - 企业别名：在 RAM 控制台的「设置」页面查看

**示例：**
- 主账号：`your-email@example.com`
- RAM 子账号：`ram-user@company-alias`

> **提示**：如果使用 RAM 子账号，需要确保该账号有推送镜像的权限。

### 2. GitHub Secrets 配置

在 GitHub 仓库中配置以下 Secrets：

1. 进入您的 GitHub 仓库
2. 点击仓库顶部的 **Settings**（设置）标签
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮，添加以下两个密钥：

   - **Name**: `ALIYUN_REGISTRY_USERNAME`
     - **Value**: 填写您在步骤 1.2 中获取的用户名
   
   - **Name**: `ALIYUN_REGISTRY_PASSWORD`
     - **Value**: 填写您在步骤 1.2 中设置的固定密码

> **注意**：Secrets 一旦保存后，GitHub 不会显示其值，只能重新创建。请妥善保管您的凭证。

### 3. 修改 Workflow 配置

编辑 `.github/workflows/docker-build.yml` 文件，修改以下环境变量：

```yaml
env:
  # 根据你的实际区域修改（如：registry.cn-beijing.aliyuncs.com）
  REGISTRY: registry.cn-hangzhou.aliyuncs.com
  # 修改为你的命名空间
  NAMESPACE: your-namespace
```

## 工作流程

### 自动触发

Workflow 会在以下情况自动触发：

- 推送到 `main` 或 `master` 分支
- 创建版本标签（如 `v1.0.0`）
- 创建 Pull Request 到 `main` 或 `master` 分支（仅构建，不推送）

### 手动触发

1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Build and Push Docker Images" workflow
3. 点击 "Run workflow" 按钮

## 镜像标签规则

- `latest`: 默认分支的最新构建
- `main-<sha>`: 基于 commit SHA 的标签
- `v1.0.0`: 语义化版本标签
- `1.0`: 主版本.次版本标签

## 本地构建测试

### 构建后端镜像

```bash
cd backend
docker build -t ai-travel-planner-backend:local .
```

### 构建前端镜像

```bash
cd frontend
docker build -t ai-travel-planner-frontend:local .
```

### 运行容器

**后端：**
```bash
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e DEEPSEEK_API_KEY=your-key \
  -e IFLYTEK_APP_ID=your-app-id \
  -e IFLYTEK_API_KEY=your-api-key \
  -e IFLYTEK_API_SECRET=your-secret \
  ai-travel-planner-backend:local
```

**前端：**
```bash
docker run -p 80:80 \
  ai-travel-planner-frontend:local
```

## 从阿里云拉取镜像

```bash
# 登录阿里云镜像仓库
docker login registry.cn-hangzhou.aliyuncs.com

# 拉取后端镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner-backend:latest

# 拉取前端镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/ai-travel-planner-frontend:latest
```

## 注意事项

1. **环境变量**：后端容器需要配置必要的环境变量（API 密钥等）
2. **网络配置**：确保容器可以访问所需的外部服务
3. **数据持久化**：根据实际需求配置数据卷
4. **安全**：生产环境建议使用更严格的镜像标签策略

