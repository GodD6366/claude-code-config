import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { loadConfigs } from './config.js';
import { loadSettings, saveSettings } from './settings.js';
import { openWithEditor } from './utils.js';

function getCurrentEnvironmentIndex(configs, settings) {
  const currentUrl = settings.env?.ANTHROPIC_BASE_URL;
  const currentToken =
    settings.env?.ANTHROPIC_API_KEY || settings.env?.ANTHROPIC_AUTH_TOKEN;

  return configs.environments.findIndex((env) => {
    const envToken = env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN;
    return env.ANTHROPIC_BASE_URL === currentUrl && envToken === currentToken;
  });
}

export async function switchClaudeEnv(paths) {
  const configs = loadConfigs('claude');
  const settings = loadSettings(paths.settingsPath);
  const currentIndex = getCurrentEnvironmentIndex(configs, settings);

  const envChoices = configs.environments.map((env, index) => ({
    name: `${env.name} ${index === currentIndex ? chalk.green('(当前)') : ''}`,
    short: env.name,
    value: index,
  }));

  try {
    const { envIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'envIndex',
        message: '选择要切换到的Claude代理:',
        choices: [
          ...envChoices,
          new inquirer.Separator(),
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ]);

    if (envIndex === 'back') {
      return;
    }

    const selectedEnv = configs.environments[envIndex];
    const newSettings = { ...settings };
    newSettings.env = newSettings.env || {};

    // 只在没有 env_bak 时才备份（即第一次使用代理时）
    if (!newSettings.env_bak) {
      newSettings.env_bak = { ...newSettings.env };
    }

    // 清除所有可能的环境变量字段（除了 name, type, description 等元数据）
    Object.keys(newSettings.env).forEach((key) => {
      if (!['name', 'type', 'description'].includes(key)) {
        delete newSettings.env[key];
      }
    });

    // 复制新环境中的所有字段（除了元数据字段）
    Object.keys(selectedEnv).forEach((key) => {
      if (!['name', 'type', 'description'].includes(key)) {
        newSettings.env[key] = selectedEnv[key];
      }
    });

    if (saveSettings(newSettings, paths.settingsPath)) {
      console.log(chalk.green(`\n✓ 已切换到代理: ${selectedEnv.name}`));
      console.log(chalk.blue(`  Base URL: ${selectedEnv.ANTHROPIC_BASE_URL}`));
      console.log(
        chalk.gray(
          `  配置类型: ${paths.type === 'project' ? '项目配置' : '全局配置'}`,
        ),
      );
    }
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
}

export async function showCurrentClaudeSettings(paths) {
  const settings = loadSettings(paths.settingsPath);

  console.log(
    chalk.bold.blue(
      `\n📋 当前${paths.type === 'project' ? '项目' : '全局'}Claude配置:`,
    ),
  );
  console.log(chalk.gray(`   配置文件: ${paths.settingsPath}`));

  const hasToken =
    settings.env?.ANTHROPIC_API_KEY || settings.env?.ANTHROPIC_AUTH_TOKEN;
  if (!settings.env || (!settings.env.ANTHROPIC_BASE_URL && !hasToken)) {
    console.log(chalk.gray('  暂无代理配置'));
  } else {
    console.log(
      chalk.white(
        `  Base URL: ${settings.env.ANTHROPIC_BASE_URL || chalk.gray('未设置')}`,
      ),
    );

    const currentToken =
      settings.env.ANTHROPIC_API_KEY || settings.env.ANTHROPIC_AUTH_TOKEN;
    const tokenType = settings.env.ANTHROPIC_API_KEY ? 'API Key' : 'Auth Token';
    console.log(
      chalk.white(
        `  ${tokenType}: ${currentToken ? 'sk-****' + currentToken.slice(-8) : chalk.gray('未设置')}`,
      ),
    );

    const configs = loadConfigs('claude');
    const currentIndex = getCurrentEnvironmentIndex(configs, settings);

    if (currentIndex !== -1) {
      console.log(
        chalk.green(`  代理名称: ${configs.environments[currentIndex].name}`),
      );
    } else {
      console.log(chalk.yellow('  代理名称: 自定义配置'));
    }
  }

  if (settings.permissions && settings.permissions.defaultMode) {
    console.log(
      chalk.white(`  Default Mode: ${settings.permissions.defaultMode}`),
    );
  } else {
    console.log(chalk.gray('  Default Mode: 未设置'));
  }

  console.log('');
  try {
    const { confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: `是否要编辑当前配置文件 (${path.basename(paths.settingsPath)})?`,
        choices: [
          { name: '✅ 编辑配置文件', value: true },
          { name: '❌ 不编辑', value: false },
          new inquirer.Separator(),
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ]);

    if (confirm === 'back') {
      return;
    }

    if (confirm) {
      await openWithEditor(paths.settingsPath);
    }
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
}

export async function setDefaultClaudeMode(paths) {
  const settings = loadSettings(paths.settingsPath);
  const modes = [
    { name: 'default - 标准行为', value: 'default' },
    { name: 'acceptEdits - 自动接受文件编辑', value: 'acceptEdits' },
    { name: 'plan - 仅计划，不修改', value: 'plan' },
    {
      name: 'bypassPermissions - 跳过所有权限提示',
      value: 'bypassPermissions',
    },
  ];
  const currentMode = settings.permissions?.defaultMode;
  console.log(
    chalk.blue(`\n当前 Default Mode: ${currentMode || chalk.gray('未设置')}`),
  );

  try {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: '选择 permissions.defaultMode:',
        choices: [
          ...modes,
          new inquirer.Separator(),
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ]);

    if (mode === 'back') {
      return;
    }

    settings.permissions = settings.permissions || {};
    settings.permissions.defaultMode = mode;

    if (saveSettings(settings, paths.settingsPath)) {
      console.log(chalk.green(`✓ 已设置 defaultMode`));
    }
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
}

export async function clearClaudeEnv(paths) {
  const settings = loadSettings(paths.settingsPath);

  if (!settings.env && !settings.env_bak) {
    console.log(chalk.yellow('⚠️  settings.json 中没有代理配置可供清除。'));
    return;
  }

  try {
    const { confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: '确定要清除 settings.json 中的代理配置吗?',
        choices: [
          { name: '✅ 确认清除', value: true },
          { name: '❌ 取消', value: false },
          new inquirer.Separator(),
          { name: '⬅️  返回主菜单', value: 'back' },
        ],
      },
    ]);

    if (confirm === 'back') {
      return;
    }

    if (confirm) {
      // 始终使用 env_bak 恢复配置
      if (settings.env_bak) {
        settings.env = { ...settings.env_bak };
        delete settings.env_bak;
        console.log(chalk.green('✓ 已恢复到原始配置'));
      } else {
        // 如果没有 env_bak，则清除所有环境变量字段
        const newEnv = { ...settings.env };

        Object.keys(newEnv).forEach((key) => {
          if (!['name', 'type', 'description'].includes(key)) {
            delete newEnv[key];
          }
        });

        if (Object.keys(newEnv).length === 0) {
          delete settings.env;
        } else {
          settings.env = newEnv;
        }
        console.log(chalk.green('✓ 已清除 settings.json 中的代理配置'));
      }

      if (saveSettings(settings, paths.settingsPath)) {
        console.log(chalk.green('✓ 配置更新成功'));
      } else {
        console.log(chalk.red('✗ 配置保存失败'));
      }
    }
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
}
