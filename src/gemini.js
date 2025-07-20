import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfigs } from './config.js';
import { readGeminiKey, writeGeminiKey } from './shell.js';

// Helper function to ensure Gemini settings are correct
function ensureGeminiSettings() {
    const geminiDir = path.join(os.homedir(), '.gemini');
    const settingsPath = path.join(geminiDir, 'settings.json');
    let settings = {};

    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

            // Check if selectedAuthType needs to be fixed
            if (settings.selectedAuthType !== 'gemini-api-key') {
                console.log(chalk.yellow(`\n⚠️  检测到认证方式设置为 "${settings.selectedAuthType || 'undefined'}"，正在自动修改为 "gemini-api-key"...`));
                settings.selectedAuthType = 'gemini-api-key';

                // Ensure directory exists
                if (!fs.existsSync(geminiDir)) {
                    fs.mkdirSync(geminiDir, { recursive: true });
                }

                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
                console.log(chalk.green(`✓ 已自动修改认证方式为 "gemini-api-key"`));
            }
        } catch (e) {
            console.log(chalk.yellow(`\n⚠️  读取 Gemini 设置文件时出错: ${e.message}`));
            console.log(chalk.blue('将创建新的设置文件...'));

            // Create new settings file with correct auth type
            if (!fs.existsSync(geminiDir)) {
                fs.mkdirSync(geminiDir, { recursive: true });
            }

            settings = {
                selectedAuthType: 'gemini-api-key',
                autoAccept: false
            };
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            console.log(chalk.green(`✓ 已创建新的 Gemini 设置文件，认证方式设置为 "gemini-api-key"`));
        }
    } else {
        // Create settings file if it doesn't exist
        console.log(chalk.blue(`\n📝 创建 Gemini 设置文件...`));

        if (!fs.existsSync(geminiDir)) {
            fs.mkdirSync(geminiDir, { recursive: true });
        }

        settings = {
            selectedAuthType: 'gemini-api-key',
            autoAccept: false
        };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        console.log(chalk.green(`✓ 已创建 Gemini 设置文件，认证方式设置为 "gemini-api-key"`));
    }

    return settings;
}

export async function switchGeminiKey() {
    const configs = loadConfigs('gemini');
    const currentKey = readGeminiKey();

    if (!configs.environments || configs.environments.length === 0) {
        console.log(chalk.yellow('⚠️  在您的 configs.json 中没有找到 "gemini" 类型的配置。'));
        console.log(chalk.blue('请先在配置文件中添加您的 Gemini API Key。'));
        return;
    }

    const choices = configs.environments.map(env => {
        const isCurrent = currentKey === env.GEMINI_API_KEY;
        return {
            name: `${env.name} ${isCurrent ? chalk.green('(当前)') : ''}`,
            value: env.GEMINI_API_KEY,
            short: env.name,
        };
    });

    try {
        const { selectedKey } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedKey',
                message: '选择要切换到的 Gemini API Key:',
                choices: choices,
            }
        ]);

                if (selectedKey) {
            writeGeminiKey(selectedKey);

            // Ensure Gemini settings are correct after switching the key
            ensureGeminiSettings();
        }

    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 用户取消操作，再见!'));
            return;
        }
        throw error;
    }
}

export async function configureGeminiSettings() {
    // Ensure Gemini settings are correct and get current settings
    const settings = ensureGeminiSettings();

    const currentStatus = settings.autoAccept === true;
    console.log(chalk.blue(`\n当前 autoAccept 状态: ${currentStatus ? chalk.green('已启用') : chalk.red('已禁用')}`));

    try {
        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: '请选择要执行的操作:',
                choices: [
                    { name: '启用 autoAccept (跳过安全操作确认)', value: true },
                    { name: '禁用 autoAccept (总是需要确认)', value: false },
                    new inquirer.Separator(),
                    { name: '返回', value: 'cancel' }
                ],
                default: currentStatus,
            }
        ]);

        if (choice === 'cancel') {
            return;
        }

        settings.autoAccept = choice;
        // Ensure selectedAuthType is always set correctly
        settings.selectedAuthType = 'gemini-api-key';

        const geminiDir = path.join(os.homedir(), '.gemini');
        const settingsPath = path.join(geminiDir, 'settings.json');

        if (!fs.existsSync(geminiDir)) {
            fs.mkdirSync(geminiDir, { recursive: true });
        }

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        console.log(chalk.green(`✓ Gemini autoAccept 已成功${choice ? '启用' : '禁用'}。`));

    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 用户取消操作。'));
            return;
        }
        throw error;
    }
}
