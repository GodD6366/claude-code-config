import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { loadConfigs } from './config.js';
import { openWithEditor } from './utils.js';

const codexConfigDir = path.join(os.homedir(), '.codex');
const codexConfigPath = path.join(codexConfigDir, 'config.toml');

function loadCodexSettings() {
  if (!fs.existsSync(codexConfigPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(codexConfigPath, 'utf8');
    // 简单的 TOML 解析，只处理我们需要的 MCP 服务器配置
    const settings = {};
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        if (currentSection.startsWith('mcp_servers.')) {
          const serverName = currentSection.split('.')[1];
          if (!settings.mcp_servers) settings.mcp_servers = {};
          settings.mcp_servers[serverName] = {};
        }
      } else if (trimmed.includes('=') && currentSection) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        const cleanKey = key.trim();
        let cleanValue = value.replace(/^["']|["']$/g, '');

        // 处理布尔值
        if (cleanValue === 'true') {
          cleanValue = true;
        } else if (cleanValue === 'false') {
          cleanValue = false;
        }

        if (value.startsWith('[') && value.endsWith(']')) {
          // 处理数组
          cleanValue = value
            .slice(1, -1)
            .split(',')
            .map((v) => v.trim().replace(/^["']|["']$/g, ''));
        }

        if (currentSection.startsWith('mcp_servers.')) {
          const serverName = currentSection.split('.')[1];
          settings.mcp_servers[serverName][cleanKey] = cleanValue;
        } else {
          if (!settings[currentSection]) settings[currentSection] = {};
          settings[currentSection][cleanKey] = cleanValue;
        }
      } else if (trimmed.includes('=') && !currentSection) {
        // 处理顶级配置项（如 experimental_use_rmcp_client）
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        const cleanKey = key.trim();
        let cleanValue = value.replace(/^["']|["']$/g, '');

        // 处理布尔值
        if (cleanValue === 'true') {
          cleanValue = true;
        } else if (cleanValue === 'false') {
          cleanValue = false;
        }

        settings[cleanKey] = cleanValue;
      }
    }

    return settings;
  } catch (error) {
    console.error(chalk.red('读取 Codex 配置文件失败:', error.message));
    return {};
  }
}

function saveCodexSettings(settings) {
  try {
    if (!fs.existsSync(codexConfigDir)) {
      fs.mkdirSync(codexConfigDir, { recursive: true });
    }

    let content = '';

    // 写入顶级配置项（如 experimental_use_rmcp_client）
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'mcp_servers') continue;
      if (typeof value !== 'object' || value === null) {
        // 处理简单值（布尔值、字符串、数字）
        if (typeof value === 'boolean') {
          content += `${key} = ${value}\n`;
        } else {
          content += `${key} = "${value}"\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        // 处理对象类型的配置项
        content += `[${key}]\n`;
        for (const [objKey, objValue] of Object.entries(value)) {
          if (Array.isArray(objValue)) {
            content += `${objKey} = [${objValue.map((v) => `"${v}"`).join(', ')}]\n`;
          } else if (typeof objValue === 'boolean') {
            content += `${objKey} = ${objValue}\n`;
          } else {
            content += `${objKey} = "${objValue}"\n`;
          }
        }
        content += '\n';
      }
    }

    // 写入 MCP 服务器配置
    if (settings.mcp_servers) {
      for (const [serverName, serverConfig] of Object.entries(
        settings.mcp_servers,
      )) {
        content += `[mcp_servers.${serverName}]\n`;
        for (const [key, value] of Object.entries(serverConfig)) {
          if (Array.isArray(value)) {
            content += `${key} = [${value.map((v) => `"${v}"`).join(', ')}]\n`;
          } else if (typeof value === 'boolean') {
            content += `${key} = ${value}\n`;
          } else {
            content += `${key} = "${value}"\n`;
          }
        }
        content += '\n';
      }
    }

    fs.writeFileSync(codexConfigPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(chalk.red('保存 Codex 配置文件失败:', error.message));
    return false;
  }
}

function getCurrentCodexMcpServers() {
  const settings = loadCodexSettings();
  return Object.keys(settings.mcp_servers || {});
}

// 导出内部函数用于测试
export { loadCodexSettings, saveCodexSettings };

export async function configureCodexMcp() {
  const configs = loadConfigs();
  const currentActiveMcpServers = getCurrentCodexMcpServers();

  const mcpChoices = Object.keys(configs.mcpServers || {}).map((name) => ({
    name: `${name} ${currentActiveMcpServers.includes(name) ? chalk.green('(已激活)') : ''}`,
    value: name,
    checked: currentActiveMcpServers.includes(name),
  }));

  if (mcpChoices.length === 0) {
    console.log('');
    console.log(chalk.yellow('配置文件中没有定义 MCP 服务器。'));
    console.log(chalk.cyan(`请先在配置文件中添加 MCP 服务器配置。`));
    console.log(chalk.gray('您可以选择 "编辑全局配置文件" 来添加 MCP 服务器配置。'));
    console.log('');
    return;
  }

  try {
    const { selectedServers } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedServers',
        message: '选择要为 Codex 激活的 MCP 服务器:',
        choices: [...mcpChoices, new inquirer.Separator()],
      },
    ]);

    // 读取现有配置
    const currentSettings = loadCodexSettings();

    // 更新 MCP 服务器配置
    if (selectedServers.length > 0) {
      currentSettings.mcp_servers = {};
      selectedServers.forEach((serverName) => {
        if (configs.mcpServers[serverName]) {
          const serverConfig = configs.mcpServers[serverName];

          if (serverConfig.type === 'http') {
            // HTTP 配置格式
            currentSettings.mcp_servers[serverName] = {};
            if (serverConfig.url) {
              currentSettings.mcp_servers[serverName].url = serverConfig.url;
            }
            if (serverConfig.bearer_token) {
              currentSettings.mcp_servers[serverName].bearer_token = serverConfig.bearer_token;
            }

            // 如果需要 OAuth 支持，启用实验性功能
            if (serverConfig.oauth || serverConfig.experimental_use_rmcp_client) {
              currentSettings.experimental_use_rmcp_client = true;
            }
          } else {
            // STDIO 配置格式 (默认)
            currentSettings.mcp_servers[serverName] = {
              command: serverConfig.command,
              args: serverConfig.args,
            };

            // 保留环境变量配置
            if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
              currentSettings.mcp_servers[serverName].env = serverConfig.env;
            }
          }
        }
      });
    } else {
      // 如果没有选择任何服务器，删除 mcp_servers 配置
      delete currentSettings.mcp_servers;
    }

    if (saveCodexSettings(currentSettings)) {
      console.log('');
      console.log(chalk.hex('#4ade80')(`✨ Codex MCP 配置成功!`));
      if (selectedServers.length > 0) {
        console.log(
          chalk.hex('#667eea')(
            `🚀 激活的服务器: ${selectedServers.join(', ')}`,
          ),
        );
      } else {
        console.log(chalk.hex('#6b7280')(`🧹 已清除所有 MCP 服务器配置`));
      }
      console.log(chalk.hex('#a8b3cf')(`📂 配置文件: ${codexConfigPath}`));
      console.log('');
    }
  } catch (error) {
    if (
      error.name === 'ExitPromptError' ||
      error.message.includes('force closed')
    ) {
      console.log(chalk.gray('\n👋 用户取消操作。'));
    } else {
      throw error;
    }
  }
}

export async function showCurrentCodexSettings() {
  const settings = loadCodexSettings();

  console.log('');
  console.log(chalk.hex('#f59e0b')('📋 Codex 配置状态'));
  console.log(chalk.hex('#6b7280')('─'.repeat(30)));
  console.log(chalk.hex('#a8b3cf')(`📂 配置文件: ${codexConfigPath}`));

  if (!fs.existsSync(codexConfigPath)) {
    console.log(chalk.hex('#ef4444')('⚠️  配置文件不存在'));
  } else {
    const mcpServers = Object.keys(settings.mcp_servers || {});
    if (mcpServers.length > 0) {
      console.log(
        chalk.hex('#4ade80')(`🚀 激活的 MCP 服务器: ${mcpServers.join(', ')}`),
      );

      // 显示每个服务器的详细信息
      for (const [serverName, serverConfig] of Object.entries(settings.mcp_servers || {})) {
        const type = serverConfig.url ? 'HTTP' : 'STDIO';
        const typeColor = type === 'HTTP' ? chalk.hex('#3b82f6') : chalk.hex('#10b981');
        console.log(chalk.hex('#a8b3cf')(`  • ${serverName}: ${typeColor(type)}`));

        if (serverConfig.url) {
          console.log(chalk.hex('#94a3b8')(`    URL: ${serverConfig.url}`));
        } else if (serverConfig.command) {
          console.log(chalk.hex('#94a3b8')(`    命令: ${serverConfig.command} ${(serverConfig.args || []).join(' ')}`));
        }
      }
    } else {
      console.log(chalk.hex('#6b7280')('💤 暂无激活的 MCP 服务器'));
    }
  }

  // 显示实验性功能状态
  if (settings.experimental_use_rmcp_client) {
    console.log(chalk.hex('#f59e0b')('🧪 实验性 RMCP 客户端: 已启用'));
  }

  console.log('');
  try {
    const { confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: `是否要编辑当前配置文件 (${path.basename(codexConfigPath)})?`,
        choices: [
          { name: '✅ 编辑配置文件', value: true },
          { name: '❌ 不编辑', value: false },
          new inquirer.Separator(),
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ]);

    if (confirm === 'back') {
      return;
    }

    if (confirm) {
      await openWithEditor(codexConfigPath);
    }
  } catch (error) {
    if (
      error.name === 'ExitPromptError' ||
      error.message.includes('force closed')
    ) {
      console.log(chalk.gray('\n👋 用户取消操作。'));
    } else {
      throw error;
    }
  }
}
