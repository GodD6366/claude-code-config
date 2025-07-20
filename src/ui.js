
import inquirer from 'inquirer';
import chalk from 'chalk';
import { exec } from 'child_process';
import { createRequire } from 'module';
import { switchClaudeEnv, showCurrentClaudeSettings, setDefaultClaudeMode, clearClaudeEnv } from './claude.js';
import { switchGeminiKey, configureGeminiSettings } from './gemini.js';
import { openWithEditor } from './utils.js';
import { getConfigPath } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

function showHeader(paths) {
    console.clear();
    console.log(chalk.bold.cyan(`🚀 环境配置管理工具 v${pkg.version}\n`));
    if (paths.type === 'project') {
        console.log(chalk.blue(`📁 项目模式 (Claude): ${paths.location}`));
    } else {
        console.log(chalk.blue('🌐 全局模式 (Claude)'));
    }
    console.log('');
}

export async function showMainMenu(paths) {
    showHeader(paths);
    
    const actions = [
        new inquirer.Separator('--- Claude ---'),
        { name: '🔄 切换Claude代理', value: 'switch_claude' },
        { name: '🔐 设置Claude权限模式', value: 'permissions_claude' },
        { name: '📋 查看当前Claude配置', value: 'view_claude' },
        { name: '🗑️  清除当前Claude代理配置', value: 'delete_claude' },
        new inquirer.Separator('--- Gemini ---'),
        { name: '🔑 设置Gemini API Key', value: 'switch_gemini' },
        { name: '⚙️  设置Gemini权限模式', value: 'config_gemini' },
        new inquirer.Separator('--- Global ---'),
        { name: '📝 编辑全局配置文件', value: 'edit_config' },
        new inquirer.Separator(),
        { name: '❌ 退出', value: 'exit' }
    ];

    try {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: '请选择操作:',
                choices: actions,
                loop: false,
            }
        ]);

        switch (action) {
            case 'switch_claude':
                await switchClaudeEnv(paths);
                break;
            case 'switch_gemini':
                await switchGeminiKey();
                break;
            case 'config_gemini':
                await configureGeminiSettings();
                break;
            case 'edit_config':
                await openWithEditor(getConfigPath());
                break;
            case 'view_claude':
                await showCurrentClaudeSettings(paths);
                break;
            case 'permissions_claude':
                await setDefaultClaudeMode(paths);
                break;
            case 'delete_claude':
                await clearClaudeEnv(paths);
                break;
            case 'exit':
                console.log(chalk.gray('👋 再见!'));
                process.exit(0);
        }
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log(chalk.gray('\n👋 用户取消操作，再见!'));
            process.exit(0);
        }
        console.error(chalk.red('发生未知错误:'), error);
    }
}

export function showVersion() {
    console.log(`claude-code-config: ${pkg.version}`);
    exec('claude -v', (error, stdout) => {
        if (error) {
            console.log(chalk.red(`claude: Not Found`));
        } else {
            console.log(`claude: ${stdout.trim()}`);
        }
    });
}

export function showUsage() {
    console.log(chalk.bold.cyan(`🚀 环境配置管理工具 v${pkg.version}\n`));
    console.log(chalk.white('用法:'));
    console.log(chalk.gray('  ccc                    # 管理全局配置'));
    console.log(chalk.gray('  ccc --project          # 管理当前目录的项目配置'));
    console.log(chalk.gray('  ccc --project /path    # 管理指定目录的项目配置'));
    console.log(chalk.gray('  ccc -p                 # --project 的简写'));
    console.log(chalk.gray('  ccc /path/to/project   # 直接指定项目路径'));
    console.log(chalk.gray('  ccc -v, --version      # 显示版本号'));
    console.log('');
}
