#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';

// 配置文件路径
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CONFIG_DIR = path.join(os.homedir(), '.claude-code-config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'configs.json');

function initializeConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        console.log(chalk.green(`✓ 已创建配置目录: ${CONFIG_DIR}`));
    }

    if (!fs.existsSync(CONFIG_PATH)) {
        const defaultConfig = {
            "environments": [
                {
                    "name": "anthropic-official",
                    "ANTHROPIC_AUTH_TOKEN": "sk-your-token-here",
                    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
                }
            ]
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(chalk.green(`✓ 已创建默认配置文件: ${CONFIG_PATH}`));
        console.log(chalk.yellow('请编辑配置文件添加您的环境设置'));
    }
}

function loadConfigs() {
    initializeConfig();

    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(chalk.red(`错误: 配置文件 ${CONFIG_PATH} 不存在或格式错误`));
        process.exit(1);
    }
}

function saveConfigs(configs) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(chalk.red('错误: 保存配置文件失败'), error.message);
        return false;
    }
}

function loadSettings() {
    try {
        const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(chalk.red(`错误: Claude设置文件 ${SETTINGS_PATH} 不存在`));
        process.exit(1);
    }
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(chalk.red('错误: 保存设置文件失败'), error.message);
        return false;
    }
}

function getCurrentEnvironmentIndex(configs, settings) {
    const currentUrl = settings.env?.ANTHROPIC_BASE_URL;
    return configs.environments.findIndex(env => env.ANTHROPIC_BASE_URL === currentUrl);
}

function switchEnvironment(env) {
    const settings = loadSettings();

    settings.env = settings.env || {};
    settings.env.ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
    settings.env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;

    return saveSettings(settings);
}

async function deleteEnvironmentFromSettings() {
    const settings = loadSettings();
    
    if (!settings.env || (!settings.env.ANTHROPIC_BASE_URL && !settings.env.ANTHROPIC_AUTH_TOKEN)) {
        console.log(chalk.yellow('⚠️  settings.json 中没有环境配置'));
        return;
    }

    console.log(chalk.blue('\n当前 settings.json 中的环境配置:'));
    console.log(chalk.white(`  Base URL: ${settings.env.ANTHROPIC_BASE_URL || '未设置'}`));
    console.log(chalk.white(`  Auth Token: ${settings.env.ANTHROPIC_AUTH_TOKEN ? 'sk-****' + settings.env.ANTHROPIC_AUTH_TOKEN.slice(-8) : '未设置'}`));

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '确定要清除 settings.json 中的环境配置吗?',
            default: false
        }
    ]);

    if (confirm) {
        // 删除环境配置但保留其他设置
        if (settings.env) {
            delete settings.env.ANTHROPIC_BASE_URL;
            delete settings.env.ANTHROPIC_AUTH_TOKEN;
            
            // 如果 env 对象为空，删除整个 env 字段
            if (Object.keys(settings.env).length === 0) {
                delete settings.env;
            }
        }
        
        if (saveSettings(settings)) {
            console.log(chalk.green('✓ 已清除 settings.json 中的环境配置'));
        }
    }
}

function showCurrentSettings() {
    const settings = loadSettings();
    
    console.log(chalk.bold.blue('\n📋 当前 settings.json 配置:'));
    
    if (!settings.env || (!settings.env.ANTHROPIC_BASE_URL && !settings.env.ANTHROPIC_AUTH_TOKEN)) {
        console.log(chalk.gray('  暂无环境配置'));
        return;
    }
    
    console.log(chalk.white(`  Base URL: ${settings.env.ANTHROPIC_BASE_URL || chalk.gray('未设置')}`));
    console.log(chalk.white(`  Auth Token: ${settings.env.ANTHROPIC_AUTH_TOKEN ? 'sk-****' + settings.env.ANTHROPIC_AUTH_TOKEN.slice(-8) : chalk.gray('未设置')}`));
    
    // 显示匹配的环境名称
    const configs = loadConfigs();
    const currentIndex = getCurrentEnvironmentIndex(configs, settings);
    
    if (currentIndex !== -1) {
        console.log(chalk.green(`  环境名称: ${configs.environments[currentIndex].name}`));
    } else {
        console.log(chalk.yellow('  环境名称: 自定义配置'));
    }
}

async function main() {
    console.clear();
    console.log(chalk.bold.cyan('🚀 Claude 环境配置管理工具\n'));

    const configs = loadConfigs();
    const settings = loadSettings();
    const currentIndex = getCurrentEnvironmentIndex(configs, settings);

    const actions = [
        { name: '🔄 切换环境', value: 'switch' },
        { name: '📋 查看当前配置', value: 'view' },
        { name: '🗑️  清除环境配置', value: 'delete' },
        { name: '📝 编辑配置文件', value: 'edit' },
        { name: '❌ 退出', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '请选择操作:',
            choices: actions
        }
    ]);

    switch (action) {
        case 'switch':
            const envChoices = configs.environments.map((env, index) => ({
                name: `${env.name} ${index === currentIndex ? chalk.green('(当前)') : ''}`,
                short: env.name,
                value: index
            }));

            const { envIndex } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'envIndex',
                    message: '选择要切换到的环境:',
                    choices: envChoices
                }
            ]);

            const selectedEnv = configs.environments[envIndex];
            if (switchEnvironment(selectedEnv)) {
                console.log(chalk.green(`\n✓ 已切换到环境: ${selectedEnv.name}`));
                console.log(chalk.blue(`  Base URL: ${selectedEnv.ANTHROPIC_BASE_URL}`));
            }
            break;

        case 'view':
            showCurrentSettings();
            break;

        case 'delete':
            await deleteEnvironmentFromSettings();
            break;

        case 'edit':
            console.log(chalk.blue(`\n📁 配置文件位置: ${CONFIG_PATH}`));
            console.log(chalk.yellow('请使用文本编辑器打开上述文件进行编辑'));
            break;

        case 'exit':
            console.log(chalk.gray('👋 再见!'));
            break;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
