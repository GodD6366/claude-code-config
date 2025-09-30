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
import {
  configureCodexMcp,
  showCurrentCodexSettings,
} from './codex.js';
import {
  openWithEditor,
  checkForUpdates,
  showUpdatePrompt,
  clearVersionCache,
} from './utils.js';
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
    console.log(chalk.gray(`  Codex 配置: ~/.codex/config.toml`));

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

    console.log(chalk.blue('\n配置文件已更新:'));
    console.log(chalk.gray(`  Claude 配置: ~/.claude.json`));
    console.log(chalk.gray(`  Gemini 配置: ~/.gemini/settings.json`));
    console.log(chalk.gray(`  Codex 配置: ~/.codex/config.toml`));

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
      showUpdatePrompt(
        pkg.name,
        updateInfo.currentVersion,
        updateInfo.latestVersion,
      );

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
        console.log(
          chalk.green('\n✓ 版本缓存已清除，下次启动不会再提示此更新'),
        );
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

  // 创建渐变标题
  const title = 'AI Config Manager';
  const version = `v${pkg.version}`;

  // 使用渐变色彩和现代化设计
  console.log('');
  console.log(
    chalk.bgHex('#667eea').hex('#ffffff').bold(`  ✨ ${title} ${version}  `),
  );
  console.log('');

  // 状态栏
  const modeIcon = paths.type === 'project' ? '📂' : '🌍';
  const modeText =
    paths.type === 'project' ? `项目: ${paths.location}` : '全局配置';
  console.log(chalk.hex('#a8b3cf')(`${modeIcon} ${modeText}`));

  // 分隔线
  console.log(
    chalk.hex('#4c5670')(
      '─'.repeat(Math.min(process.stdout.columns || 80, 60)),
    ),
  );
  console.log('');
}

function getOptimalPageSize() {
  const terminalHeight = process.stdout.rows || 24;
  const terminalWidth = process.stdout.columns || 80;

  // 计算可用高度：总高度减去头部信息、提示信息、底部空间
  const headerLines = 6; // 头部信息大约占6行
  const promptLines = 3; // 提示信息占3行
  const bufferLines = 2; // 底部缓冲空间

  const availableHeight = Math.max(
    10,
    terminalHeight - headerLines - promptLines - bufferLines,
  );

  // 根据终端宽度调整页面大小
  // 窄终端需要更小的页面大小来避免换行问题
  const widthFactor = terminalWidth < 80 ? 0.8 : 1;

  return Math.min(30, Math.floor(availableHeight * widthFactor));
}

export async function showMainMenu(paths) {
  while (true) {
    showHeader(paths);

    const actions = [
      new inquirer.Separator(
        chalk.hex('#667eea')('╭─ Claude AI ─────────────────────────╮'),
      ),
      { name: '⚡️ 切换代理配置', value: 'switch_claude' },
      { name: '🛡️  权限模式设置', value: 'permissions_claude' },
      { name: '📊 查看当前配置', value: 'view_claude' },
      { name: '🔧 MCP 配置', value: 'config_claude_mcp' },
      { name: '🧹 清除代理配置', value: 'delete_claude' },
      new inquirer.Separator(
        chalk.hex('#4ade80')('╭─ Google Gemini ─────────────────────╮'),
      ),
      { name: '🔑 API Key 管理', value: 'switch_gemini' },
      { name: '⚙️  配置权限模式', value: 'config_gemini' },
      { name: '📊 查看当前配置', value: 'view_gemini' },
      {
        name: '🔧 MCP 配置',
        value: 'config_gemini_mcp',
      },
      new inquirer.Separator(
        chalk.hex('#f59e0b')('╭─ OpenAI Codex ──────────────────────╮'),
      ),
      { name: '📊 查看当前配置', value: 'view_codex' },
      {
        name: '🔧 MCP 配置',
        value: 'config_codex_mcp',
      },
      new inquirer.Separator(
        chalk.hex('#06b6d4')('╭─ 全局设置 ──────────────────────────╮'),
      ),
      { name: '🌐 统一 MCP 配置 (所有工具)', value: 'config_mcp' },
      { name: '🚀 API 配置中心', value: 'multi_api' },
      { name: '📝 编辑全局配置文件', value: 'edit_config' },
      { name: '🎨 编辑器设置', value: 'set_editor' },
      new inquirer.Separator(
        chalk.hex('#ec4899')('╭─ 系统工具 ──────────────────────────╮'),
      ),
      { name: '🔍 检查更新', value: 'check_update' },
      new inquirer.Separator(
        chalk.hex('#6b7280')('╰─────────────────────────────────────╯'),
      ),
      { name: chalk.red('❌ 退出程序'), value: 'exit' },
    ];

    try {
      const pageSize = getOptimalPageSize();

      // 在窄终端下显示提示信息
      if (process.stdout.columns < 80) {
        console.log(
          chalk.hex('#fbbf24')('💡 提示: 使用 ↑↓ 导航，空格选择，回车确认'),
        );
        console.log('');
      }

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.hex('#667eea')('🎯 选择要执行的操作:'),
          choices: actions,
          pageSize: pageSize,
        },
      ]);

      switch (action) {
        case 'multi_api':
          await configureMultiApi();
          break;
        case 'config_mcp':
          await handleMcpConfig();
          break;
        case 'config_claude_mcp':
          await configureClaudeMcp();
          break;
        case 'config_gemini_mcp':
          await configureGeminiMcp();
          break;
        case 'config_codex_mcp':
          await configureCodexMcp();
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
        case 'view_claude':
          await showCurrentClaudeSettings(paths);
          break;
        case 'view_gemini':
          await configureGeminiSettings();
          break;
        case 'view_codex':
          await showCurrentCodexSettings();
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
          console.log('');
          console.log(chalk.hex('#667eea')('✨ 感谢使用 AI Config Manager!'));
          console.log(chalk.hex('#a8b3cf')('🚀 Happy coding!'));
          console.log('');
          process.exit(0);
      }
    } catch (error) {
      if (
        error.name === 'ExitPromptError' ||
        error.message.includes('force closed')
      ) {
        console.log('');
        console.log(chalk.hex('#a8b3cf')('👋 操作已取消，感谢使用!'));
        console.log('');
        process.exit(0);
      }
      console.error(chalk.hex('#ef4444')('❌ 发生未知错误:'), error);
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
        },
      },
    ]);

    configs.editor = editor.trim();
    if (saveConfigs(configs)) {
      console.log(chalk.green(`✓ 编辑器已设置为: ${editor.trim()}`));
    } else {
      console.log(chalk.red('❌ 保存配置失败'));
    }
  } catch (error) {
    if (
      error.name === 'ExitPromptError' ||
      error.message.includes('force closed')
    ) {
      console.log(chalk.gray('\n👋 用户取消操作。'));
    } else {
      console.error(chalk.red('设置编辑器失败:'), error.message);
    }
  }
}

export function showUsage() {
  console.log('');
  console.log(
    chalk
      .bgHex('#667eea')
      .hex('#ffffff')
      .bold(`  ✨ AI Config Manager v${pkg.version}  `),
  );
  console.log('');
  console.log(chalk.hex('#667eea')('📖 使用说明:'));
  console.log('');
  console.log(
    chalk.hex('#4ade80')('  ccc                   ') +
      chalk.hex('#a8b3cf')(' # 打开主菜单 (全局配置)'),
  );
  console.log(
    chalk.hex('#4ade80')('  ccc --project         ') +
      chalk.hex('#a8b3cf')(' # 管理当前目录项目配置'),
  );
  console.log(
    chalk.hex('#4ade80')('  ccc --project /path   ') +
      chalk.hex('#a8b3cf')(' # 管理指定目录项目配置'),
  );
  console.log(
    chalk.hex('#4ade80')('  ccc -p                ') +
      chalk.hex('#a8b3cf')(' # --project 简写'),
  );
  console.log(
    chalk.hex('#4ade80')('  ccc /path/to/project  ') +
      chalk.hex('#a8b3cf')(' # 直接指定项目路径'),
  );
  console.log(
    chalk.hex('#4ade80')('  ccc --version         ') +
      chalk.hex('#a8b3cf')(' # 显示版本信息'),
  );
  console.log('');
  console.log(
    chalk.hex('#6b7280')('🚀 支持 Claude、Gemini 和 Codex 的统一配置管理'),
  );
  console.log('');
}

// Claude 专用 MCP 配置
async function configureClaudeMcp() {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const claudeConfigPath = path.join(os.homedir(), '.claude.json');
  const configs = loadConfigs();

  // 读取当前 Claude 配置
  let claudeConfig = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
    } catch (error) {
      console.log(
        chalk.hex('#fbbf24')('⚠️  Claude 配置文件格式错误，将创建新配置'),
      );
    }
  }

  const currentActiveMcpServers = Object.keys(claudeConfig.mcpServers || {});

  const mcpChoices = Object.keys(configs.mcpServers).map((name) => ({
    name: `${name} ${currentActiveMcpServers.includes(name) ? chalk.hex('#4ade80')('(已激活)') : ''}`,
    value: name,
    checked: currentActiveMcpServers.includes(name),
  }));

  console.log('');
  console.log(chalk.hex('#667eea')('🔵 Claude 专用 MCP 配置'));
  console.log(chalk.hex('#6b7280')('─'.repeat(30)));
  console.log('');

  try {
    const { selectedServers } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedServers',
        message: chalk.hex('#667eea')('选择要为 Claude 激活的 MCP 服务器:'),
        choices: [...mcpChoices, new inquirer.Separator()],
      },
    ]);

    // 更新 Claude MCP 服务器配置
    if (selectedServers.length > 0) {
      claudeConfig.mcpServers = {};
      selectedServers.forEach((serverName) => {
        if (configs.mcpServers[serverName]) {
          claudeConfig.mcpServers[serverName] = configs.mcpServers[serverName];
        }
      });
    } else {
      delete claudeConfig.mcpServers;
    }

    // 保存配置
    const dir = path.dirname(claudeConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      claudeConfigPath,
      JSON.stringify(claudeConfig, null, 2),
      'utf8',
    );

    console.log('');
    console.log(chalk.hex('#4ade80')(`✨ Claude MCP 配置成功!`));
    if (selectedServers.length > 0) {
      console.log(
        chalk.hex('#667eea')(`🚀 激活的服务器: ${selectedServers.join(', ')}`),
      );
    } else {
      console.log(chalk.hex('#6b7280')(`🧹 已清除所有 MCP 服务器配置`));
    }
    console.log(chalk.hex('#a8b3cf')(`📂 配置文件: ${claudeConfigPath}`));
    console.log('');
  } catch (error) {
    if (
      error.name === 'ExitPromptError' ||
      error.message.includes('force closed')
    ) {
      console.log(chalk.hex('#a8b3cf')('\n👋 操作已取消'));
    } else {
      throw error;
    }
  }
}

// Gemini 专用 MCP 配置
async function configureGeminiMcp() {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const geminiConfigDir = path.join(os.homedir(), '.gemini');
  const geminiConfigPath = path.join(geminiConfigDir, 'settings.json');
  const configs = loadConfigs();

  // 读取当前 Gemini 配置
  let geminiConfig = {};
  if (fs.existsSync(geminiConfigPath)) {
    try {
      geminiConfig = JSON.parse(fs.readFileSync(geminiConfigPath, 'utf8'));
    } catch (error) {
      console.log(
        chalk.hex('#fbbf24')('⚠️  Gemini 配置文件格式错误，将创建新配置'),
      );
    }
  }

  const currentActiveMcpServers = Object.keys(geminiConfig.mcpServers || {});

  const mcpChoices = Object.keys(configs.mcpServers).map((name) => ({
    name: `${name} ${currentActiveMcpServers.includes(name) ? chalk.hex('#4ade80')('(已激活)') : ''}`,
    value: name,
    checked: currentActiveMcpServers.includes(name),
  }));

  console.log('');
  console.log(chalk.hex('#4ade80')('🟢 Gemini 专用 MCP 配置'));
  console.log(chalk.hex('#6b7280')('─'.repeat(30)));
  console.log('');

  try {
    const { selectedServers } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedServers',
        message: chalk.hex('#4ade80')('选择要为 Gemini 激活的 MCP 服务器:'),
        choices: [...mcpChoices, new inquirer.Separator()],
      },
    ]);

    // 更新 Gemini MCP 服务器配置
    if (selectedServers.length > 0) {
      geminiConfig.mcpServers = {};
      selectedServers.forEach((serverName) => {
        if (configs.mcpServers[serverName]) {
          geminiConfig.mcpServers[serverName] = configs.mcpServers[serverName];
        }
      });
    } else {
      delete geminiConfig.mcpServers;
    }

    // 保存配置
    if (!fs.existsSync(geminiConfigDir)) {
      fs.mkdirSync(geminiConfigDir, { recursive: true });
    }

    fs.writeFileSync(
      geminiConfigPath,
      JSON.stringify(geminiConfig, null, 2),
      'utf8',
    );

    console.log('');
    console.log(chalk.hex('#4ade80')(`✨ Gemini MCP 配置成功!`));
    if (selectedServers.length > 0) {
      console.log(
        chalk.hex('#4ade80')(`🚀 激活的服务器: ${selectedServers.join(', ')}`),
      );
    } else {
      console.log(chalk.hex('#6b7280')(`🧹 已清除所有 MCP 服务器配置`));
    }
    console.log(chalk.hex('#a8b3cf')(`📂 配置文件: ${geminiConfigPath}`));
    console.log('');
  } catch (error) {
    if (
      error.name === 'ExitPromptError' ||
      error.message.includes('force closed')
    ) {
      console.log(chalk.hex('#a8b3cf')('\n👋 操作已取消'));
    } else {
      throw error;
    }
  }
}
