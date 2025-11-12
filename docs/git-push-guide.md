# Git 推送指南

本文档说明如何将代码推送到 GitHub 的 main 或 master 分支，以触发 GitHub Actions 自动构建 Docker 镜像。

## 前提条件

1. 已安装 Git（[下载地址](https://git-scm.com/downloads)）
2. 已创建 GitHub 仓库
3. 已配置 Git 用户信息（如果还没有）

## 首次推送（初始化仓库）

### 1. 初始化 Git 仓库

如果项目还没有初始化为 Git 仓库：

```bash
# 在项目根目录执行
git init
```

### 2. 配置 Git 用户信息（如果还没有配置）

```bash
git config --global user.name "你的名字"
git config --global user.email "your-email@example.com"
```

### 3. 添加远程仓库

```bash
# 将 YOUR_USERNAME 和 YOUR_REPO 替换为你的 GitHub 用户名和仓库名
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 或者使用 SSH（如果已配置 SSH 密钥）
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
```

### 4. 添加文件并提交

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: Add Docker build workflow"
```

### 5. 创建并切换到 main 分支（如果还没有）

```bash
# 创建并切换到 main 分支
git branch -M main

# 或者使用 master 分支
# git branch -M master
```

### 6. 推送到远程仓库

```bash
# 推送到 main 分支
git push -u origin main

# 或者推送到 master 分支
# git push -u origin master
```

## 后续推送（已有仓库）

### 方法一：直接推送到 main/master 分支

```bash
# 1. 检查当前分支
git branch

# 2. 如果不在 main 分支，切换到 main 分支
git checkout main
# 或者
git checkout master

# 3. 确保代码是最新的（可选，如果有其他人也在推送）
git pull origin main

# 4. 添加更改的文件
git add .

# 5. 提交更改
git commit -m "描述你的更改"

# 6. 推送到远程仓库
git push origin main
# 或者
git push origin master
```

### 方法二：通过 Pull Request（推荐）

如果仓库设置了分支保护，或者你想进行代码审查：

```bash
# 1. 创建新分支
git checkout -b feature/your-feature-name

# 2. 添加和提交更改
git add .
git commit -m "描述你的更改"

# 3. 推送新分支到远程
git push -u origin feature/your-feature-name
```

然后在 GitHub 网页上创建 Pull Request，合并到 main/master 分支。

## 常用 Git 命令

### 查看状态和分支

```bash
# 查看当前状态
git status

# 查看所有分支
git branch -a

# 查看远程仓库信息
git remote -v
```

### 切换分支

```bash
# 切换到 main 分支
git checkout main

# 切换到 master 分支
git checkout master

# 创建并切换到新分支
git checkout -b new-branch-name
```

### 拉取最新代码

```bash
# 拉取 main 分支的最新代码
git pull origin main

# 拉取 master 分支的最新代码
git pull origin master
```

### 查看提交历史

```bash
# 查看提交历史
git log

# 查看简洁的提交历史
git log --oneline
```

## 推送后触发 GitHub Actions

推送代码到 main 或 master 分支后：

1. GitHub Actions 会自动触发构建
2. 进入 GitHub 仓库的 **Actions** 标签页查看构建进度
3. 构建完成后，镜像会自动推送到阿里云容器镜像仓库

## 推送标签触发构建

如果你想通过版本标签触发构建：

```bash
# 创建标签
git tag v1.0.0

# 推送标签到远程
git push origin v1.0.0

# 或者推送所有标签
git push origin --tags
```

## 常见问题

### 1. 推送被拒绝（Push rejected）

**原因**：远程分支有新的提交，本地分支落后了。

**解决方法**：
```bash
# 先拉取远程更改
git pull origin main --rebase

# 然后再推送
git push origin main
```

### 2. 忘记设置远程仓库

**解决方法**：
```bash
# 查看是否已设置远程仓库
git remote -v

# 如果没有，添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### 3. 想修改默认分支名称

```bash
# 将当前分支重命名为 main
git branch -M main

# 推送到远程并设置上游
git push -u origin main
```

然后在 GitHub 仓库设置中将默认分支改为 main。

## 注意事项

1. **提交前检查**：确保 `.env` 等敏感文件已添加到 `.gitignore`
2. **提交信息**：使用清晰的提交信息，便于追踪更改
3. **分支保护**：如果仓库设置了分支保护，需要通过 Pull Request 合并
4. **权限**：确保你有推送权限

