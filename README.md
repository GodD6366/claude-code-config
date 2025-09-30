# Claude, Gemini & Codex Config Switcher (CCC)

一个用于管理 Claude、Gemini 和 Codex 环境配置的命令行工具。

## 功能特性

- 🔄 **快速切换Claude代理** - 在多个预设代理中为指定环境（项目/全局）快速切换。
- 💎 **Gemini Key 管理** - 从配置文件中选择 Gemini Key，并直接写入 `~/.gemini/.env`。
- 🛠️ **Codex MCP 配置** - 为 Codex 配置 MCP 服务器，支持从全局配置选择激活的服务器。
- 🔧 **MCP 服务器统一配置** - 统一管理 Claude、Gemini 和 Codex 的 MCP 服务器配置，支持多选激活。
- 🔐 **权限模式管理** - 独立管理不同环境的 `permissions.defaultMode` 设置。
- 📁 **项目/全局配置** - 支持项目级别和全局级别的 `settings.json` 配置管理。
- 🗄️ **集中管理** - 所有Claude代理、Gemini Key、Codex和MCP服务器配置集中存储在一个全局文件中，方便维护。
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

### Claude AI 工具
- ⚡️ **切换代理配置** - 从配置中选择一个 `claude` 代理，应用到当前目标的 `settings.json`
- 🛡️ **权限模式设置** - 修改 `settings.json` 中的 `permissions.defaultMode`
- 📊 **查看当前配置** - 显示当前 Claude 配置状态
- 🔧 **Claude MCP 配置** - 仅为 Claude 配置特定的 MCP 服务器
- 🧹 **清除代理配置** - 从 `settings.json` 中移除代理相关的 `env` 设置

### Google Gemini 工具
- 🔑 **API Key 管理** - 从配置中选择一个 `gemini` Key，并写入 `~/.gemini/.env`
- ⚙️ **配置权限模式** - 配置 Gemini 相关权限设置
- 📊 **查看当前配置** - 显示当前 Gemini 配置状态
- 🔧 **Gemini MCP 配置** - 仅为 Gemini 配置特定的 MCP 服务器

### GitHub Codex 工具
- 📊 **查看当前配置** - 显示当前 Codex 配置状态
- 🔧 **Codex MCP 配置** - 仅为 Codex 配置特定的 MCP 服务器
- 🧹 **清除 MCP 配置** - 从 `config.toml` 中移除 MCP 服务器配置

### 全局设置
- 🌐 **统一 MCP 配置 (所有工具)** - 一次性为所有三个工具配置相同的 MCP 服务器
- 🚀 **API 配置中心** - 管理多个 API 配置
- 📝 **编辑全局配置文件** - 使用编辑器打开 `configs.json`
- 🎨 **编辑器设置** - 配置默认编辑器

### 系统工具
- 🔍 **检查更新** - 检查工具是否有新版本
- ❌ **退出程序** - 退出工具

## MCP 服务器配置

MCP (Model Context Protocol) 服务器配置允许您为 Claude、Gemini 和 Codex 统一管理外部工具和服务。

### 配置结构

- `mcpServers`: 定义可用的 MCP 服务器配置对象
- `activeMcpServers`: 当前激活的 MCP 服务器名称列表

每个 MCP 服务器配置包含：
- `type`: 连接类型，通常为 "stdio"
- `command`: 启动命令，如 "npx"
- `args`: 命令参数数组
- `env`: 环境变量对象

### 配置应用方式

#### 统一配置
当您选择 **统一配置** 后，工具会自动：
- 将选中的 MCP 服务器配置合并到现有的 `~/.claude.json` 文件中
- 将选中的 MCP 服务器配置合并到现有的 `~/.gemini/settings.json` 文件中
- 将选中的 MCP 服务器配置合并到现有的 `~/.codex/config.toml` 文件中

#### 专用配置
当您选择 **专用配置** 后，工具会：
- 仅更新对应工具的配置文件
- 不影响其他工具的 MCP 配置
- 允许为不同工具配置不同的 MCP 服务器组合

#### 灵活性优势
- **快速统一** - 需要所有工具使用相同 MCP 服务器时，使用统一配置
- **精确控制** - 需要为特定工具配置专门服务器时，使用专用配置
- **独立管理** - 各工具配置互不干扰，可以灵活组合

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
