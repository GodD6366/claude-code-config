# NPM 发布指南

## 准备工作

1. **注册 NPM 账号**: 访问 [npmjs.com](https://www.npmjs.com/) 注册账号

2. **登录 NPM**: 
   ```bash
   npm login
   ```

3. **设置 GitHub Secrets**:
   - 在 GitHub 项目设置中添加 `NPM_TOKEN`
   - 获取 NPM Token: `npm token create --access=public`

## 发布流程

### 方式一：手动发布

```bash
# 1. 确保所有更改已提交
git add .
git commit -m "feat: 新功能或修复"

# 2. 更新版本并发布
npm run release          # 补丁版本 (1.0.0 -> 1.0.1)
npm run release:minor    # 次版本 (1.0.0 -> 1.1.0)  
npm run release:major    # 主版本 (1.0.0 -> 2.0.0)
```

### 方式二：GitHub Actions 自动发布

1. **创建标签并推送**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions 将自动**:
   - 运行测试
   - 发布到 NPM
   - 创建 GitHub Release

## 版本管理

- **补丁版本** (1.0.x): 错误修复
- **次版本** (1.x.0): 新功能，向后兼容
- **主版本** (x.0.0): 破坏性更改

## 发布前检查清单

- [ ] 代码测试通过
- [ ] README.md 已更新
- [ ] 版本号已更新
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] 所有更改已提交

## 撤销发布

如果需要撤销已发布的版本：

```bash
# 24小时内可以撤销
npm unpublish claude-code-config@1.0.0

# 或者弃用版本
npm deprecate claude-code-config@1.0.0 "This version has issues"
```