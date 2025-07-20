# Claude & Gemini Config Switcher (CCC)

一个用于管理 Claude 和 Gemini 环境配置的命令行工具。

## 功能特性

- 🔄 **快速切换Claude代理** - 在多个预设代理中为指定环境（项目/全局）快速切换。
- 💎 **Gemini Key 管理** - 从配置文件中选择 Gemini Key，并快速设置到 `~/.zshrc` 或 `~/.bashrc`。
- 🔧 **MCP 服务器统一配置** - 统一管理 Claude 和 Gemini 的 MCP 服务器配置，支持多选激活。
- 🔐 **权限模式管理** - 独立管理不同环境的 `permissions.defaultMode` 设置。
- 📁 **项目/全局配置** - 支持项目级别和全局级别的 `settings.json` 配置管理。
- 🗄️ **集中管理** - 所有Claude代理、Gemini Key和MCP服务器配置集中存储在一个全局文件中，方便维护。
- 🖥️ **编辑器集成** - 自动调用 Cursor 或 VS Code 编辑配置文件。

## 安装

```bash
npm install -g claude-code-config
```

## 使用方法

```bash
# 打开主菜单
ccc

# 管理当前目录的项目配置 (仅影响Claude配置)
ccc --project
ccc -p

# 管理指定目录的项目配置 (仅影响Claude配置)
ccc --project /path/to/project
ccc /path/to/project

# 直接配置 MCP 服务器
ccc mcp

# 查看帮助
ccc --help
ccc -h
```

## 配置文件

所有配置都集中在 `~/.claude-code-config/configs.json` 文件中。

- **位置**: `~/.claude-code-config/configs.json`
- **用途**: 定义所有可供选择的Claude代理和Gemini Key。
- **格式**:
  ```json
  {
    "environments": [
      {
        "name": "anthropic-official",
        "type": "claude",
        "ANTHROPIC_API_KEY": "sk-your-api-key-here",
        "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
      },
      {
        "name": "google-gemini-official",
        "type": "gemini",
        "GEMINI_API_KEY": "your-gemini-api-key-here"
      },
      {
        "name": "another-gemini-key",
        "type": "gemini",
        "GEMINI_API_KEY": "another-gemini-api-key"
      }
    ],
    "mcpServers": {
      "context7": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "env": {}
      }
    },
    "activeMcpServers": []
  }
  ```
  > **提示**: `type` 字段用于区分 `"claude"` 和 `"gemini"` 配置。

## 功能菜单

- 🔄 **切换Claude代理** - 从配置中选择一个 `claude` 代理，应用到当前目标的 `settings.json`。
- 🔑 **设置Gemini Key** - 从配置中选择一个 `gemini` Key，并将其写入 shell 配置文件。
- 🔧 **配置MCP服务器** - 从配置中选择要激活的 MCP 服务器（支持多选），自动应用到 Claude (`~/.claude.json`) 和 Gemini (`~/.gemini/settings.json`) 配置文件。
- 📝 **编辑全局配置文件** - 使用编辑器打开 `configs.json`。
- 📋 **查看当前Claude配置** - 显示当前目标的 `settings.json` 内容。
- 🔐 **设置Claude权限模式** - 修改 `settings.json` 中的 `permissions.defaultMode`。
- 🗑️ **清除当前Claude代理配置** - 从 `settings.json` 中移除代理相关的 `env` 设置。
- ❌ **退出** - 退出程序。

## MCP 服务器配置

MCP (Model Context Protocol) 服务器配置允许您为 Claude 和 Gemini 统一管理外部工具和服务。

### 配置结构

- `mcpServers`: 定义可用的 MCP 服务器配置对象
- `activeMcpServers`: 当前激活的 MCP 服务器名称列表

每个 MCP 服务器配置包含：
- `type`: 连接类型，通常为 "stdio"
- `command`: 启动命令，如 "npx"
- `args`: 命令参数数组
- `env`: 环境变量对象

### 配置应用

当您选择激活的 MCP 服务器后，工具会自动：
- 将选中的 MCP 服务器配置合并到现有的 `~/.claude.json` 文件中
- 将选中的 MCP 服务器配置合并到现有的 `~/.gemini/settings.json` 文件中
- 如果没有激活任何服务器，将从配置文件中移除 `mcpServers` 键，保留其他配置
- 配置文件的其他设置（如 API 密钥等）将被保留

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
