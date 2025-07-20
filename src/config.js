
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const configDir = path.join(os.homedir(), '.claude-code-config');
const configPath = path.join(configDir, 'configs.json');

function initializeConfig() {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log(chalk.green(`✓ 已创建配置目录: ${configDir}`));
    }

    if (!fs.existsSync(configPath)) {
        const defaultConfig = {
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
                }
            ]
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(chalk.green(`✓ 已创建默认配置文件: ${configPath}`));
        console.log(chalk.yellow('请编辑配置文件添加您的环境设置'));
    } else {
        // Migrate existing config file if necessary
        try {
            const data = fs.readFileSync(configPath, 'utf8');
            const configs = JSON.parse(data);
            let needsMigration = false;

            if (configs.environments && Array.isArray(configs.environments)) {
                configs.environments.forEach(env => {
                    if (!env.type) {
                        env.type = 'claude';
                        needsMigration = true;
                    }
                });
            }

            if (needsMigration) {
                fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
                console.log(chalk.blue('✓ 您的配置文件已自动更新以兼容新版本。'));
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
