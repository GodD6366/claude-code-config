
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const configDir = path.join(os.homedir(), '.claude-code-config');
const configPath = path.join(configDir, 'configs.json');

function initializeConfig() {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(configPath)) {
        const defaultConfig = {
            "environments": [
                {
                    "name": "anthropic-official",
                    "type": "claude",
                    "description": "官方Anthropic Claude API",
                    "ANTHROPIC_API_KEY": "sk-your-api-key-here",
                    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
                },
                {
                    "name": "google-gemini-official",
                    "type": "gemini",
                    "description": "官方Google Gemini API",
                    "GEMINI_API_KEY": "your-gemini-api-key-here",
                    "GEMINI_MODEL": "gemini-2.5-pro"
                },
                {
                    "name": "moonshot-kimi",
                    "type": "claude",
                    "description": "Moonshot Kimi API",
                    "ANTHROPIC_API_KEY": "your-moonshot-api-key-here",
                    "ANTHROPIC_BASE_URL": "https://api.moonshot.cn/anthropic",
                    "ANTHROPIC_MODEL": "kimi-k2-turbo-preview"
                },
                {
                    "name": "deepseek-official",
                    "type": "claude",
                    "description": "Deepseek API",
                    "ANTHROPIC_API_KEY": "your-deepseek-api-key-here",
                    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
                    "ANTHROPIC_MODEL": "deepseek-chat"
                }
            ],
            "activeEnvironment": null,
            "mcpServers": {
                "context7": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "@upstash/context7-mcp"],
                    "env": {}
                },
                "filesystem": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
                    "env": {}
                },
                "brave-search": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
                    "env": {
                        "BRAVE_API_KEY": "your-brave-api-key"
                    }
                }
            },
            "activeMcpServers": []
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    } else {
        // Migrate existing config file if necessary
        try {
            const data = fs.readFileSync(configPath, 'utf8');
            const configs = JSON.parse(data);
            let needsMigration = false;

            if (configs.environments && Array.isArray(configs.environments)) {
                configs.environments.forEach(env => {
                    let envNeedsMigration = false;

                    if (!env.type) {
                        env.type = 'claude';
                        envNeedsMigration = true;
                    }

                    if (env.ANTHROPIC_MODEL && !env.ANTHROPIC_SMALL_FAST_MODEL) {
                        env.ANTHROPIC_SMALL_FAST_MODEL = env.ANTHROPIC_MODEL;
                        envNeedsMigration = true;

                    }

                    if (envNeedsMigration) {
                        needsMigration = true;
                    }
                });
            }

            if (!configs.mcpServers) {
                configs.mcpServers = {};
                needsMigration = true;
            }
            if (!configs.activeMcpServers) {
                configs.activeMcpServers = [];
                needsMigration = true;
            }
            if (!configs.activeEnvironment) {
                configs.activeEnvironment = null;
                needsMigration = true;
            }

            if (needsMigration) {
                fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
            }
        } catch (error) {
            // Ignore errors, the main load function will handle them.
        }
    }
}

export function loadConfigs(type = null) {
    initializeConfig();

    try {
        const data = fs.readFileSync(configPath, 'utf8');
        const configs = JSON.parse(data);

        // 确保有默认的 copyKeys 配置
        if (!configs.copyKeys && type === 'claude') {
            configs.copyKeys = [
                "ANTHROPIC_BASE_URL",
                "ANTHROPIC_AUTH_TOKEN",
                "ANTHROPIC_API_KEY",
                "ANTHROPIC_MODEL",
                "ANTHROPIC_SMALL_FAST_MODEL"
            ];
        }

        if (type) {
            return {
                ...configs,
                environments: configs.environments.filter(env => {
                    // For backward compatibility, if type is 'claude', treat items without a type as 'claude'.
                    if (type === 'claude') {
                        return !env.type || env.type === 'claude';
                    }
                    return env.type === type;
                })
            };
        }
        return configs;
    } catch (error) {
        console.error(chalk.red(`错误: 配置文件 ${configPath} 不存在或格式错误`));
        process.exit(1);
    }
}

export function saveConfigs(configs) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(chalk.red('错误: 保存配置文件失败'), error.message);
        return false;
    }
}

export function getConfigPath() {
    return configPath;
}
