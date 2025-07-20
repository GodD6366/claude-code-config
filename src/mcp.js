import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { loadConfigs } from './config.js';

const claudeConfigPath = path.join(os.homedir(), '.claude.json');
const geminiConfigDir = path.join(os.homedir(), '.gemini');
const geminiConfigPath = path.join(geminiConfigDir, 'settings.json');

// Export paths for other modules to use
export { claudeConfigPath, geminiConfigPath };

// Helper function to safely read config file
function readConfigFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.log(chalk.yellow(`配置文件格式错误，将创建新配置: ${filePath} - ${error.message}`));
        return {};
    }
}

// Helper function to safely write config file
function writeConfigFile(filePath, config) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.log(chalk.red(`写入配置文件失败: ${filePath} - ${error.message}`));
        return false;
    }
}

export function applyMcpConfig() {
    const configs = loadConfigs();
    const { mcpServers, activeMcpServers } = configs;

    if (!mcpServers || typeof mcpServers !== 'object' || Object.keys(mcpServers).length === 0) {
        console.log(chalk.yellow('配置文件中没有找到 MCP 服务器配置。'));
        return;
    }

    if (!activeMcpServers || activeMcpServers.length === 0) {
        console.log(chalk.yellow('没有活动的 MCP 服务器。将清除现有 MCP 配置。'));

                // Clear Claude MCP config
        const claudeConfig = readConfigFile(claudeConfigPath);
        if (claudeConfig.mcpServers) {
            delete claudeConfig.mcpServers;
            if (writeConfigFile(claudeConfigPath, claudeConfig)) {
                console.log(chalk.gray(`已从 Claude 配置中移除 mcpServers: ${claudeConfigPath}`));
            }
        }

        // Clear Gemini MCP config
        const geminiConfig = readConfigFile(geminiConfigPath);
        if (geminiConfig.mcpServers) {
            delete geminiConfig.mcpServers;
            if (writeConfigFile(geminiConfigPath, geminiConfig)) {
                console.log(chalk.gray(`已从 Gemini 配置中移除 mcpServers: ${geminiConfigPath}`));
            }
        }

        console.log(chalk.green('✓ 已清除 Claude 和 Gemini 的 MCP 服务器配置。'));
        return;
    }

    // Filter active servers from the mcpServers object
    const activeServerConfigs = {};
    activeMcpServers.forEach(serverName => {
        if (mcpServers[serverName]) {
            activeServerConfigs[serverName] = mcpServers[serverName];
        }
    });

    if (Object.keys(activeServerConfigs).length === 0) {
        console.log(chalk.yellow('活动的 MCP 服务器名称在配置中未找到。'));
        return;
    }

    console.log(chalk.blue(`正在应用 ${Object.keys(activeServerConfigs).length} 个 MCP 服务器的配置:`));
    Object.keys(activeServerConfigs).forEach(serverName => {
        console.log(chalk.gray(`  - ${serverName}`));
    });

    // Apply Claude config
    const claudeConfig = readConfigFile(claudeConfigPath);
    claudeConfig.mcpServers = activeServerConfigs;
    if (writeConfigFile(claudeConfigPath, claudeConfig)) {
        console.log(chalk.green(`✓ 已将 ${Object.keys(activeServerConfigs).length} 个服务器的配置应用到: ${claudeConfigPath}`));
        console.log(chalk.gray(`  Claude 服务器: ${Object.keys(activeServerConfigs).join(', ')}`));
    }

    // Apply Gemini config
    const geminiConfig = readConfigFile(geminiConfigPath);
    geminiConfig.mcpServers = activeServerConfigs;
    if (writeConfigFile(geminiConfigPath, geminiConfig)) {
        console.log(chalk.green(`✓ 已将 ${Object.keys(activeServerConfigs).length} 个服务器的配置应用到: ${geminiConfigPath}`));
        console.log(chalk.gray(`  Gemini 服务器: ${Object.keys(activeServerConfigs).join(', ')}`));
    }
}

export function showMcpStatus() {
    console.log(chalk.blue('\n📋 当前 MCP 配置状态:\n'));

    // Check Claude config
    const claudeConfig = readConfigFile(claudeConfigPath);
    if (Object.keys(claudeConfig).length === 0) {
        console.log(chalk.gray('○ Claude MCP 配置不存在'));
    } else if (claudeConfig.mcpServers && Object.keys(claudeConfig.mcpServers).length > 0) {
        console.log(chalk.green('✓ Claude MCP 配置已存在'));
        console.log(chalk.gray(`  路径: ${claudeConfigPath}`));
        console.log(chalk.gray(`  服务器数量: ${Object.keys(claudeConfig.mcpServers).length}`));
        console.log(chalk.gray(`  服务器列表: ${Object.keys(claudeConfig.mcpServers).join(', ')}`));
    } else {
        console.log(chalk.gray('○ Claude 配置文件存在但没有 MCP 服务器'));
    }

    // Check Gemini config
    const geminiConfig = readConfigFile(geminiConfigPath);
    if (Object.keys(geminiConfig).length === 0) {
        console.log(chalk.gray('○ Gemini MCP 配置不存在'));
    } else if (geminiConfig.mcpServers && Object.keys(geminiConfig.mcpServers).length > 0) {
        console.log(chalk.green('✓ Gemini MCP 配置已存在'));
        console.log(chalk.gray(`  路径: ${geminiConfigPath}`));
        console.log(chalk.gray(`  服务器数量: ${Object.keys(geminiConfig.mcpServers).length}`));
        console.log(chalk.gray(`  服务器列表: ${Object.keys(geminiConfig.mcpServers).join(', ')}`));
    } else {
        console.log(chalk.gray('○ Gemini 配置文件存在但没有 MCP 服务器'));
    }

    console.log('');
}
