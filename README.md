# Claude Code Config (CCC)

一个用于管理 Claude Code 环境配置的命令行工具，支持快速切换不同的 Claude 代理服务器和权限设置。

## 功能特性

- 🔄 **快速切换代理** - 在多个预设代理中为指定环境（项目/全局）快速切换。
- 🔐 **权限模式管理** - 独立管理不同环境的 `permissions.defaultMode` 设置。
- 📁 **项目/全局配置** - 支持项目级别和全局级别的 `settings.json` 配置管理。
- 🗄️ **集中管理** - 所有代理配置信息集中存储在一个全局文件中，方便维护。
- 🖥️ **编辑器集成** - 自动调用 Cursor 或 VS Code 编辑配置文件。
- 📋 **配置查看** - 直观显示当前环境的配置状态。

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
# 管理全局配置 (目标: ~/.claude/settings.json)
ccc

# 管理当前目录的项目配置 (目标: ./ .claude/settings.json)
ccc --project
ccc -p

# 管理指定目录的项目配置 (目标: /path/to/project/.claude/settings.json)
ccc --project /path/to/project
ccc /path/to/project

# 查看帮助
ccc --help
ccc -h
```

## 配置文件

### 1. 代理列表 (全局唯一)

这是您所有代理配置的中央存储库。

- **位置**: `~/.claude-code-config/configs.json`
- **用途**: 定义所有可供选择的代理环境。
- **格式**:
  ```json
  {
    "environments": [
      {
        "name": "anyrouter",
        "ANTHROPIC_AUTH_TOKEN": "sk-your-token-here",
        "ANTHROPIC_BASE_URL": "https://anyrouter.top"
      },
      {
        "name": "kimi-k2",
        "ANTHROPIC_AUTH_TOKEN": "sk-proxy-token-here",
        "ANTHROPIC_BASE_URL": "https://api.moonshot.cn/anthropic"
      }
    ]
  }
  ```
  > **提示**: 如果您需要一个免费的代理服务，可以考虑使用 [AnyRouter](https://anyrouter.top/register?aff=KGbT)。

### 2. Claude 设置文件 (应用目标)

这是 CCC 工具实际读取和修改的文件，Claude Code 也依赖此文件来获取配置。

- **全局设置**: `~/.claude/settings.json`
- **项目设置**: `{project}/.claude/settings.json`

## 功能菜单

启动 `ccc` 后，您可以选择以下操作：

- 🔄 **切换代理** - 从全局代理列表中选择一个，应用到当前目标的 `settings.json`。
- 📝 **编辑代理配置** - 使用编辑器打开并修改全局代理列表 `configs.json`。
- 🔐 **设置权限模式** - 修改当前目标 `settings.json` 中的 `permissions.defaultMode`。
- 📋 **查看当前Claude配置** - 显示当前目标 `settings.json` 的内容，并可选择直接编辑此文件。
- 🗑️  **清除代理配置** - 从当前目标 `settings.json` 中移除代理相关的 `env` 设置。
- ❌ **退出** - 退出程序。

### 权限模式

支持在 `settings.json` 中设置以下 `permissions.defaultMode`：

- **default** - 标准行为，首次使用每个工具时提示权限。
- **acceptEdits** - 自动接受文件编辑权限。
- **plan** - 计划模式，只能分析不能修改。
- **bypassPermissions** - 跳过所有权限提示。

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
