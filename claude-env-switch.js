#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { spawn, exec } from 'child_process';

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        projectPath: null,
        isProject: false
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' || args[i] === '-p') {
            options.isProject = true;
            if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
                options.projectPath = path.resolve(args[i + 1]);
            } else {
                options.projectPath = process.cwd();
            }
        } else if (!args[i].startsWith('-') && !options.projectPath) {
            // 如果传入了路径参数
            options.projectPath = path.resolve(args[i]);
            options.isProject = true;
        }
    }

    return options;
}

// 获取配置路径
function getConfigPaths(isProject, projectPath) {
    if (isProject) {
        const settingsPath = path.join(projectPath, '.claude', 'settings.json');
        const configDir = path.join(projectPath, '.claude-code-config');
        const configPath = path.join(configDir, 'configs.json');

        return {
            settingsPath,
            configDir,
            configPath,
            type: 'project',
            location: projectPath
        };
    } else {
        const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
        const configDir = path.join(os.homedir(), '.claude-code-config');
        const configPath = path.join(configDir, 'configs.json');

        return {
            settingsPath,
            configDir,
            configPath,
            type: 'global',
            location: os.homedir()
        };
    }
}

function initializeConfig(paths) {
    if (!fs.existsSync(paths.configDir)) {
        fs.mkdirSync(paths.configDir, { recursive: true });
        console.log(chalk.green(`✓ 已创建配置目录: ${paths.configDir}`));
    }

    if (!fs.existsSync(paths.configPath)) {
        const defaultConfig = {
            "environments": [
                {
                    "name": "anthropic-official",
                    "ANTHROPIC_AUTH_TOKEN": "sk-your-token-here",
                    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
                }
            ]
        };
        fs.writeFileSync(paths.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        console.log(chalk.green(`✓ 已创建默认配置文件: ${paths.configPath}`));
        console.log(chalk.yellow('请编辑配置文件添加您的环境设置'));
    }
}

function loadConfigs(paths) {
    initializeConfig(paths);

    try {
        const data = fs.readFileSync(paths.configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(chalk.red(`错误: 配置文件 ${paths.configPath} 不存在或格式错误`));
        process.exit(1);
    }
}

function saveConfigs(configs, paths) {
    try {
        fs.writeFileSync(paths.configPath, JSON.stringify(configs, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(chalk.red('错误: 保存配置文件失败'), error.message);
        return false;
    }
}

function loadSettings(paths) {
    try {
        const data = fs.readFileSync(paths.settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(chalk.red(`错误: Claude设置文件 ${paths.settingsPath} 不存在`));

        if (paths.type === 'project') {
            console.log(chalk.yellow('提示: 项目配置文件不存在，将创建新的配置文件'));

            // 确保目录存在
            const dir = path.dirname(paths.settingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 创建默认配置
            const defaultSettings = {
                "name": "project-settings",
                "description": "Project-specific Claude Code settings"
            };

            fs.writeFileSync(paths.settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
            console.log(chalk.green(`✓ 已创建项目配置文件: ${paths.settingsPath}`));

            return defaultSettings;
        }

        process.exit(1);
    }
}

function saveSettings(settings, paths) {
    try {
        // 确保目录存在
        const dir = path.dirname(paths.settingsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(paths.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
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

function switchEnvironment(env, paths) {
    const settings = loadSettings(paths);

    settings.env = settings.env || {};
    settings.env.ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
    settings.env.ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;

    return saveSettings(settings, paths);
}

async function deleteEnvironmentFromSettings(paths) {
    const settings = loadSettings(paths);

    if (!settings.env || (!settings.env.ANTHROPIC_BASE_URL && !settings.env.ANTHROPIC_AUTH_TOKEN)) {
        console.log(chalk.yellow('⚠️  settings.json 中没有代理配置'));
        return;
    }

    console.log(chalk.blue('\n当前 settings.json 中的代理配置:'));
    console.log(chalk.white(`  Base URL: ${settings.env.ANTHROPIC_BASE_URL || '未设置'}`));
    console.log(chalk.white(`  Auth Token: ${settings.env.ANTHROPIC_AUTH_TOKEN ? 'sk-****' + settings.env.ANTHROPIC_AUTH_TOKEN.slice(-8) : '未设置'}`));

    let confirm;
    try {
        const result = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: '确定要清除 settings.json 中的代理配置吗?',
                default: false
            }
        ]);
        confirm = result.confirm;
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 再见!'));
            return;
        }
        throw error;
    }

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

        if (saveSettings(settings, paths)) {
            console.log(chalk.green('✓ 已清除 settings.json 中的代理配置'));
        }
    }
}

function showCurrentSettings(paths) {
    const settings = loadSettings(paths);

    console.log(chalk.bold.blue(`\n📋 当前${paths.type === 'project' ? '项目' : '全局'}配置:`));
    console.log(chalk.gray(`   配置文件: ${paths.settingsPath}`));

    if (!settings.env || (!settings.env.ANTHROPIC_BASE_URL && !settings.env.ANTHROPIC_AUTH_TOKEN)) {
        console.log(chalk.gray('  暂无代理配置'));
    } else {
        console.log(chalk.white(`  Base URL: ${settings.env.ANTHROPIC_BASE_URL || chalk.gray('未设置')}`));
        console.log(chalk.white(`  Auth Token: ${settings.env.ANTHROPIC_AUTH_TOKEN ? 'sk-****' + settings.env.ANTHROPIC_AUTH_TOKEN.slice(-8) : chalk.gray('未设置')}`));

        // 显示匹配的环境名称
        const configs = loadConfigs(paths);
        const currentIndex = getCurrentEnvironmentIndex(configs, settings);

        if (currentIndex !== -1) {
            console.log(chalk.green(`  代理名称: ${configs.environments[currentIndex].name}`));
        } else {
            console.log(chalk.yellow('  代理名称: 自定义配置'));
        }
    }

    if (settings.permissions && settings.permissions.defaultMode) {
        console.log(chalk.white(`  Default Mode: ${settings.permissions.defaultMode}`));
    } else {
        console.log(chalk.gray('  Default Mode: 未设置'));
    }
}

async function setDefaultMode(paths) {
    const settings = loadSettings(paths);

    const modes = [
        { name: 'default - 标准行为，首次使用每个工具时提示权限', short: 'default', value: 'default' },
        { name: 'acceptEdits - 自动接受文件编辑权限', short: 'acceptEdits', value: 'acceptEdits' },
        { name: 'plan - 计划模式，只能分析不能修改', short: 'plan', value: 'plan' },
        { name: 'bypassPermissions - 跳过所有权限提示', short: 'bypassPermissions', value: 'bypassPermissions' },
        { name: '清除设置', short: 'clear', value: 'clear' }
    ];

    const currentMode = settings.permissions?.defaultMode;
    console.log(chalk.blue(`\n当前 Default Mode: ${currentMode || chalk.gray('未设置')}`));

    let mode;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'mode',
                message: '选择 permissions.defaultMode:',
                choices: modes
            }
        ]);
        mode = result.mode;
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 用户取消操作，再见!'));
            return;
        }
        throw error;
    }

    if (mode === 'clear') {
        if (settings.permissions) {
            delete settings.permissions.defaultMode;

            if (Object.keys(settings.permissions).length === 0) {
                delete settings.permissions;
            }
        }

        if (saveSettings(settings, paths)) {
            console.log(chalk.green('✓ 已清除 defaultMode 设置'));
        }
    } else {
        settings.permissions = settings.permissions || {};
        settings.permissions.defaultMode = mode;

        if (saveSettings(settings, paths)) {
            console.log(chalk.green(`✓ 已设置 defaultMode 为: ${mode}`));
        }
    }
}

async function openWithEditor(filePath) {
    const editors = ['cursor', 'code'];

    for (const editor of editors) {
        try {
            // 检查编辑器是否可用
            await new Promise((resolve, reject) => {
                exec(`which ${editor}`, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            // 如果编辑器可用，使用它打开文件
            console.log(chalk.blue(`\n🚀 使用 ${editor} 打开配置文件...`));
            spawn(editor, [filePath], {
                detached: true,
                stdio: 'ignore'
            }).unref();

            console.log(chalk.green(`✓ 已在 ${editor} 中打开: ${filePath}`));
            return true;

        } catch (error) {
            // 编辑器不可用，尝试下一个
            continue;
        }
    }

    // 所有编辑器都不可用，回退到显示路径
    console.log(chalk.yellow('\n⚠️  未找到 cursor 或 code 编辑器'));
    console.log(chalk.blue(`📁 配置文件位置: ${filePath}`));
    console.log(chalk.gray('请手动使用文本编辑器打开上述文件进行编辑'));
    return false;
}

function showUsage() {
    console.log(chalk.bold.cyan('🚀 Claude 环境配置管理工具\n'));
    console.log(chalk.white('用法:'));
    console.log(chalk.gray('  ccc                    # 管理全局配置'));
    console.log(chalk.gray('  ccc --project          # 管理当前目录的项目配置'));
    console.log(chalk.gray('  ccc --project /path    # 管理指定目录的项目配置'));
    console.log(chalk.gray('  ccc -p                 # --project 的简写'));
    console.log(chalk.gray('  ccc /path/to/project   # 直接指定项目路径'));
    console.log('');
}

async function main() {
    const options = parseArgs();

    // 检查帮助参数
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showUsage();
        return;
    }

    const paths = getConfigPaths(options.isProject, options.projectPath);

    console.clear();
    console.log(chalk.bold.cyan('🚀 Claude 环境配置管理工具\n'));

    if (paths.type === 'project') {
        console.log(chalk.blue(`📁 项目模式: ${paths.location}`));
    } else {
        console.log(chalk.blue('🌐 全局模式'));
    }
    console.log('');

    const configs = loadConfigs(paths);
    const settings = loadSettings(paths);
    const currentIndex = getCurrentEnvironmentIndex(configs, settings);

    const actions = [
        { name: '🔄 切换代理', value: 'switch' },
        { name: '🔐 设置权限模式', value: 'permissions' },
        { name: '📋 查看当前配置', value: 'view' },
        { name: '🗑️  清除代理配置', value: 'delete' },
        { name: '📝 编辑配置文件', value: 'edit' },
        { name: '❌ 退出', value: 'exit' }
    ];

    let action;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '请选择操作:',
                choices: actions
            }
        ]);
        action = result.action;
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 用户取消操作，再见!'));
            return;
        }
        throw error;
    }

    switch (action) {
        case 'switch':
            const envChoices = configs.environments.map((env, index) => ({
                name: `${env.name} ${index === currentIndex ? chalk.green('(当前)') : ''}`,
                short: env.name,
                value: index
            }));

            let envIndex;
            try {
                const result = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'envIndex',
                        message: '选择要切换到的代理:',
                        choices: envChoices
                    }
                ]);
                envIndex = result.envIndex;
            } catch (error) {
                if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
                    console.log(chalk.gray('\n👋 用户取消操作，再见!'));
                    return;
                }
                throw error;
            }

            const selectedEnv = configs.environments[envIndex];
            if (switchEnvironment(selectedEnv, paths)) {
                console.log(chalk.green(`\n✓ 已切换到代理: ${selectedEnv.name}`));
                console.log(chalk.blue(`  Base URL: ${selectedEnv.ANTHROPIC_BASE_URL}`));
                console.log(chalk.gray(`  配置类型: ${paths.type === 'project' ? '项目配置' : '全局配置'}`));
            }
            break;

        case 'permissions':
            await setDefaultMode(paths);
            break;

        case 'view':
            showCurrentSettings(paths);
            break;

        case 'delete':
            await deleteEnvironmentFromSettings(paths);
            break;

        case 'edit':
            await openWithEditor(paths.configPath);
            break;

        case 'exit':
            console.log(chalk.gray('👋 再见!'));
            break;
    }
}

// 直接执行 main 函数，无论如何调用
main().catch(console.error);
