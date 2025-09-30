import inquirer from 'inquirer';
import chalk from 'chalk';
import { exec } from 'child_process';
import { createRequire } from 'module';
import {
  switchClaudeEnv,
  showCurrentClaudeSettings,
  setDefaultClaudeMode,
  clearClaudeEnv,
} from './claude.js';
import { switchGeminiKey, configureGeminiSettings } from './gemini.js';
import { openWithEditor, checkForUpdates, showUpdatePrompt, clearVersionCache } from './utils.js';
import { getConfigPath, saveConfigs, loadConfigs } from './config.js';
import { applyMcpConfig, showMcpStatus } from './mcp.js';
import { configureMultiApi } from './multi-api.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export async function selectMcpServer(configs) {
  const { mcpServers, activeMcpServers } = configs;

  if (
    !mcpServers ||
    typeof mcpServers !== 'object' ||
    Object.keys(mcpServers).length === 0
  ) {
    console.log(chalk.yellow('配置文件中没有定义 MCP 服务器。'));
    console.log(chalk.cyan(`请先在配置文件中添加 MCP 服务器配置:`));
    console.log(chalk.gray(`配置文件路径: ${getConfigPath()}`));
    console.log(
      chalk.gray('您可以选择 "编辑全局配置文件" 来添加 MCP 服务器配置。'),
    );
    return null;
  }

  const serverNames = Object.keys(mcpServers);
  console.log(chalk.blue('可用的 MCP 服务器:'));
  serverNames.forEach((serverName) => {
    const server = mcpServers[serverName];
    const status = activeMcpServers.includes(serverName)
      ? chalk.green('(已激活)')
      : chalk.gray('(未激活)');
    const type = server.type || 'stdio';
    const command = `${server.command} ${server.args ? server.args.join(' ') : ''}`;
    console.log(chalk.gray(`  ${serverName} ${status} - ${type}: ${command}`));
  });
  console.log('');

  const mcpPageSize = Math.min(20, getOptimalPageSize());

  const { selection } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selection',
      message: '请选择要激活的 MCP 服务器 (可多选，使用空格键选择/取消选择)',
      choices: [
        ...serverNames.map((serverName) => ({
          name: `${serverName} ${activeMcpServers.includes(serverName) ? chalk.green('(当前已激活)') : ''}`,
          value: serverName,
          checked: activeMcpServers.includes(serverName),
        })),
      ],
      pageSize: mcpPageSize,
    },
  ]);

  // Ask user what to do next
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      choices: [
        { name: '✅ 确认并应用配置', value: 'confirm' },
        { name: '⬅️  返回主菜单', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return null;
  }

  // Update the active servers in the main config
  configs.activeMcpServers = selection;

  if (saveConfigs(configs)) {
    console.log(
      chalk.green(`\n✓ 已保存配置：${selection.length} 个服务器被选中`),
    );
    if (selection.length > 0) {
      console.log(chalk.gray(`  激活的服务器: ${selection.join(', ')}`));
    }
  } else {
    console.log(chalk.red('\n✗ 保存配置失败'));
    return null;
  }

  return selection;
}

async function handleMcpConfig() {
  console.log(chalk.bold.cyan('\n🔧 MCP 服务器配置\n'));
  const configs = loadConfigs();

  // Show current active servers
  if (configs.activeMcpServers && configs.activeMcpServers.length > 0) {
    console.log(chalk.blue('当前激活的 MCP 服务器:'));
    configs.activeMcpServers.forEach((serverName) => {
      console.log(chalk.green(`  ✓ ${serverName}`));
    });
    console.log('');
  } else {
    console.log(chalk.gray('当前没有激活的 MCP 服务器\n'));
  }

  // Show MCP configuration status
  showMcpStatus();

  const selection = await selectMcpServer(configs);

  if (selection !== null && selection.length > 0) {
    console.log(chalk.blue('\n正在应用选择的配置...'));
    applyMcpConfig();
    console.log(chalk.green.bold('\n✓ MCP 服务器配置已成功应用！'));

    console.log(chalk.blue('\n配置文件已更新:'));
    console.log(chalk.gray(`  Claude 配置: ~/.claude.json`));
    console.log(chalk.gray(`  Gemini 配置: ~/.gemini/settings.json`));

    console.log(chalk.gray('\n按回车键继续...'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: '',
        prefix: '',
      },
    ]);
  } else if (selection !== null && selection.length === 0) {
    // User deselected all servers
    console.log(chalk.blue('\n正在应用选择的配置...'));
    applyMcpConfig();
    console.log(chalk.green.bold('\n✓ MCP 服务器配置已成功应用！'));
    console.log(chalk.yellow('  已清除所有激活的 MCP 服务器'));

    console.log(chalk.gray('\n按回车键继续...'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: '',
        prefix: '',
      },
    ]);
  }
  // If selection is null, user chose to go back, so do nothing
}

async function handleCheckUpdate() {
  console.log(chalk.bold.cyan('\n🔍 检查更新\n'));
  console.log(chalk.gray('正在检查最新版本...'));

  let updateInfo = null;
  try {
    updateInfo = await checkForUpdates(pkg.name, pkg.version);

    if (updateInfo.hasUpdate && updateInfo.latestVersion) {
      showUpdatePrompt(pkg.name, updateInfo.currentVersion, updateInfo.latestVersion);

      // 询问用户是否已经更新
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '请选择操作:',
          choices: [
            { name: '✅ 我已经更新了，清除更新提示', value: 'updated' },
            { name: '⬅️  稍后更新，返回主菜单', value: 'later' },
          ],
        },
      ]);

      if (action === 'updated') {
        await clearVersionCache();
        console.log(chalk.green('\n✓ 版本缓存已清除，下次启动不会再提示此更新'));
      }

    } else if (updateInfo.latestVersion) {
      console.log(chalk.green('✓ 您使用的是最新版本!'));
      console.log(chalk.gray(`   当前版本: ${updateInfo.currentVersion}`));
      console.log(chalk.gray(`   最新版本: ${updateInfo.latestVersion}`));

      // 清除可能存在的过期缓存
      await clearVersionCache();
    } else {
      console.log(chalk.yellow('⚠️  无法获取最新版本信息'));
    }
  } catch (error) {
    console.log(chalk.red('✗ 检查更新失败:'), error.message);
  }

  if (!updateInfo?.hasUpdate) {
    console.log(chalk.gray('\n按回车键继续...'));
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: '',
        prefix: '',
      },
    ]);
  }
}

function showHeader(paths) {
  console.clear();
  console.log(chalk.bold.cyan(`🚀 环境配置管理工具 v${pkg.version}\n`));

  if (paths.type === 'project') {
    console.log(chalk.blue(`📁 项目模式: ${paths.location}`));
  } else {
    console.log(chalk.blue('🌐 全局模式'));
  }
  console.log('');
}

function getOptimalPageSize() {
  const terminalHeight = process.stdout.rows || 24;
  const terminalWidth = process.stdout.columns || 80;

  // 计算可用高度：总高度减去头部信息、提示信息、底部空间
  const headerLines = 6; // 头部信息大约占6行
  const promptLines = 3; // 提示信息占3行
  const bufferLines = 2; // 底部缓冲空间

  const availableHeight = Math.max(10, terminalHeight - headerLines - promptLines - bufferLines);

  // 根据终端宽度调整页面大小
  // 窄终端需要更小的页面大小来避免换行问题
  const widthFactor = terminalWidth < 80 ? 0.8 : 1;

  return Math.min(30, Math.floor(availableHeight * widthFactor));
}

export async function showMainMenu(paths) {
  while (true) {
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
      new inquirer.Separator('--- MCP 服务器 ---'),
      { name: '🔧 配置 MCP 服务器', value: 'config_mcp' },
      new inquirer.Separator('--- Global ---'),
      { name: '🚀 管理API配置', value: 'multi_api' },
      { name: '📝 编辑全局配置文件', value: 'edit_config' },
      { name: '🎨 设置编辑器', value: 'set_editor' },
      new inquirer.Separator('--- 工具 ---'),
      { name: '🔍 检查更新', value: 'check_update' },
      new inquirer.Separator(),
      { name: '❌ 退出', value: 'exit' },
    ];

    try {
      const pageSize = getOptimalPageSize();

      // 在窄终端下显示提示信息
      if (process.stdout.columns < 80) {
        console.log(chalk.yellow('💡 提示: 使用方向键 ↑↓ 滚动菜单，回车键选择'));
      }

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '请选择操作:',
          choices: actions,
          pageSize: pageSize,
        },
      ]);

      switch (action) {
        case 'multi_api':
          await configureMultiApi();
          break;
        case 'switch_claude':
          await switchClaudeEnv(paths);
          break;
        case 'switch_gemini':
          await switchGeminiKey();
          break;
        case 'config_gemini':
          await configureGeminiSettings();
          break;
        case 'config_mcp':
          await handleMcpConfig();
          break;
        case 'edit_config':
          try {
            await openWithEditor(getConfigPath());
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
          break;
        case 'set_editor':
          await setEditor();
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
        case 'check_update':
          await handleCheckUpdate();
          break;
        case 'exit':
          console.log(chalk.gray('👋 再见!'));
          process.exit(0);
      }
    } catch (error) {
      if (
        error.name === 'ExitPromptError' ||
        error.message.includes('force closed')
      ) {
        console.log(chalk.gray('\n👋 用户取消操作，再见!'));
        process.exit(0);
      }
      console.error(chalk.red('发生未知错误:'), error);
    }
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

async function setEditor() {
  try {
    const configs = loadConfigs();
    const currentEditor = configs.editor || 'zed';

    console.log(chalk.blue('\n🎨 编辑器配置'));
    console.log(chalk.gray(`当前编辑器: ${currentEditor}`));

    const { editor } = await inquirer.prompt([
      {
        type: 'input',
        name: 'editor',
        message: '请输入编辑器命令（如 zed, cursor, code, vim 等）:',
        default: currentEditor,
        validate: (input) => {
          if (!input.trim()) {
            return '编辑器命令不能为空';
          }
          return true;
        }
      }
    ]);

    configs.editor = editor.trim();
    if (saveConfigs(configs)) {
      console.log(chalk.green(`✓ 编辑器已设置为: ${editor.trim()}`));
    } else {
      console.log(chalk.red('❌ 保存配置失败'));
    }
  } catch (error) {
    if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
      console.log(chalk.gray('\n👋 用户取消操作。'));
    } else {
      console.error(chalk.red('设置编辑器失败:'), error.message);
    }
  }
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
