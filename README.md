# AiTravelPlanner
使用 AI 生成旅行计划，并支持用户管理与云端同步

## 功能概览
- 智能行程规划：输入目的地、日期、预算、偏好与同行人数，生成行程与预算。
- 费用预算与管理：语音/文本记账、AI 预算分析与建议。
- 用户管理：Supabase 邮箱密码登录/注册、会话管理。
- 云端数据同步：行程与开销保存到云端，跨设备查看与修改。

## 本地开发
1. 安装依赖（需 Node.js 18+）
   - 前端：`cd frontend && npm i && npm run dev`
   - 后端：`cd backend && npm i && npm run dev`
2. 环境变量（前端 `.env`）
   - `VITE_API_BASE`：后端地址，如 `http://localhost:3000`
   - `VITE_SUPABASE_URL`：Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`：Supabase 匿名 Key

## Supabase 配置
1. 创建项目并获取 `URL` 与 `ANON KEY` 填入前端 `.env`
2. 执行 SQL（Supabase 控制台 SQL Editor）建表与 RLS：`docs/supabase/schema.sql`
3. 前端自动使用当前登录用户 `user_id` 存储 `plans` 与 `expenses` 数据。

## 关键页面
- `PlannerPage`：行程生成与展示（登录后可保存到云端）
- `BudgetPage`：语音记账与 AI 分析（登录后可同步到云端）
- `AuthPage`：邮箱密码注册/登录、退出登录

## 依赖
- 前端：React、React Router、@supabase/supabase-js
- 后端：Express、Zod

## Docker 部署

项目支持通过 Docker 容器化部署，并使用 GitHub Actions 自动构建和推送到阿里云镜像仓库。

详细配置说明请参考：[Docker 部署指南](docs/docker-deployment.md)

### 快速开始

1. 配置阿里云容器镜像服务（创建命名空间和镜像仓库）
2. 在 GitHub 仓库中配置 Secrets：
   - `ALIYUN_REGISTRY_USERNAME`
   - `ALIYUN_REGISTRY_PASSWORD`
3. 修改 `.github/workflows/docker-build.yml` 中的 `REGISTRY` 和 `NAMESPACE`
4. 推送代码到 `main` 分支即可自动构建和推送镜像
   - 详细推送步骤请参考：[Git 推送指南](docs/git-push-guide.md)

## 注意
- 预览需启动前端开发服务器；本环境若无 Node.js 将无法浏览 UI。
