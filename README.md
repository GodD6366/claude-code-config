# Claude Code Config (CCC)

一个用于管理 Claude Code 环境配置的命令行工具，支持快速切换不同的 Claude 代理服务器和权限设置。

## 功能特性

- 🔄 **快速切换代理** - 在多个 Claude API 代理之间快速切换
- 🔐 **权限模式管理** - 独立管理 `permissions.defaultMode` 设置
- 📁 **项目/全局配置** - 支持项目级别和全局级别的配置管理
- 🖥️ **编辑器集成** - 自动调用 Cursor 或 VS Code 编辑配置文件
- 📋 **配置查看** - 直观显示当前配置状态

## 为什么使用 CCC 而不是环境变量？

直接在 `.zshrc` 或 `.bashrc` 中配置环境变量是常见做法，但存在一些弊端：

- **污染全局环境** - 所有项目共享同一套配置，容易产生冲突。
- **切换繁琐** - 需要手动修改、`source` 配置文件才能生效，效率低下。
- **管理不便** - 配置分散，难以追踪不同项目的特定设置。

CCC 通过项目级和全局级的配置文件解决了这些问题，让您能够：

- **隔离环境** - 为不同项目设置独立的代理和权限，互不干扰。
- **一键切换** - 通过菜单快速切换配置，无需重启终端。
- **集中管理** - 将所有环境配置集中在一个 `configs.json` 文件中，清晰明了。

## 安装

```bash
npm install -g claude-code-config
```

## 使用方法

### 基本命令

```bash
# 管理全局配置
ccc

# 管理当前目录的项目配置
ccc --project
ccc -p

# 管理指定目录的项目配置
ccc --project /path/to/project
ccc /path/to/project

# 查看帮助
ccc --help
ccc -h
```

### 配置格式

在 `~/.claude-code-config/configs.json` (全局) 或项目目录下的 `.claude-code-config/configs.json` (项目) 中配置代理：

```json
{
  "environments": [
    {
      "name": "anthropic-official",
      "ANTHROPIC_AUTH_TOKEN": "sk-your-token-here",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
    },
    {
      "name": "proxy-server",
      "ANTHROPIC_AUTH_TOKEN": "sk-proxy-token-here",
      "ANTHROPIC_BASE_URL": "https://your-proxy.com"
    }
  ]
}
```

### 权限模式

支持以下 `permissions.defaultMode` 设置：

- **default** - 标准行为，首次使用每个工具时提示权限
- **acceptEdits** - 自动接受文件编辑权限
- **plan** - 计划模式，只能分析不能修改
- **bypassPermissions** - 跳过所有权限提示

## 功能菜单

启动 `ccc` 后，您可以选择以下操作：

- 🔄 **切换代理** - 在配置的代理服务器之间切换
- 🔐 **设置权限模式** - 独立管理权限模式设置
- 📋 **查看当前配置** - 显示当前的代理和权限配置
- 🗑️ **清除代理配置** - 从 settings.json 中清除代理设置
- 📝 **编辑配置文件** - 使用 Cursor 或 VS Code 编辑配置
- ❌ **退出** - 退出程序

## 配置文件位置

### 全局配置
- 配置文件：`~/.claude-code-config/configs.json`
- Claude 设置：`~/.claude/settings.json`

### 项目配置
- 配置文件：`{project}/.claude-code-config/configs.json`
- Claude 设置：`{project}/.claude/settings.json`

## 开发

```bash
# 克隆项目
git clone <repository-url>
cd claude-code-config

# 安装依赖
npm install

# 运行
node claude-env-switch.js
```

## 许可证

ISC

## 贡献

欢迎提交 Issues 和 Pull Requests！