#!/usr/bin/env node

import { parseArgs, getClaudeConfigPaths, checkUpdateAsync, checkCachedUpdate, showUpdatePrompt } from './src/utils.js';
import { showMainMenu, showUsage, showVersion } from './src/ui.js';
import { loadConfigs } from './src/config.js';
import { applyMcpConfig } from './src/mcp.js';
import chalk from 'chalk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

async function handleMcpCommand() {
    const { selectMcpServer } = await import('./src/ui.js');
    console.log(chalk.bold.cyan('🚀 MCP 服务器配置\n'));
    const configs = loadConfigs();
    const selection = await selectMcpServer(configs);

    if (selection !== null) {
        console.log(chalk.blue('\n正在应用选择的配置...'));
        applyMcpConfig();
        console.log(chalk.green.bold('\n✓ 配置成功！'));
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    if (args.includes('--version') || args.includes('-v')) {
        showVersion();
        return;
    }

    if (args.includes('mcp')) {
        await handleMcpCommand();
        return;
    }

            // 检查缓存的更新信息（不阻塞）
    let hasUpdate = false;
    try {
        // 先检查缓存中是否有更新信息
        const cachedUpdate = await checkCachedUpdate(pkg.name, pkg.version);
        if (cachedUpdate && cachedUpdate.hasUpdate) {
            hasUpdate = true;
            showUpdatePrompt(pkg.name, cachedUpdate.currentVersion, cachedUpdate.latestVersion);

            // 等待用户确认看到更新提示
            try {
                const inquirer = (await import('inquirer')).default;
                await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'continue',
                        message: '按回车键继续...',
                        prefix: '',
                    },
                ]);
            } catch (promptError) {
                // 如果用户取消或者输入有问题，继续运行
                console.log('');
            }
        }

        // 异步检查最新版本（不阻塞主程序）
        checkUpdateAsync(pkg.name, pkg.version);

    } catch (error) {
        // 静默处理更新检查错误，不影响主程序运行
        console.error(chalk.gray('检查更新失败，继续运行...'));
    }

    const options = parseArgs();
    const claudePaths = getClaudeConfigPaths(options.isProject, options.projectPath);

    await showMainMenu(claudePaths, hasUpdate);
}

main();
