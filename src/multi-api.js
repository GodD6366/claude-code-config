import inquirer from 'inquirer';
import chalk from 'chalk';
import { getConfigPath, saveConfigs, loadConfigs } from './config.js';

export async function configureMultiApi() {
  console.log(chalk.bold.cyan('\n🚀 API配置管理\n'));

  const configs = loadConfigs();

  // 确保environments数组存在
  if (!configs.environments) {
    configs.environments = [];
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      choices: [
        { name: '➕ 添加API配置', value: 'add' },
        { name: '📋 查看当前配置', value: 'view' },
        { name: '✏️  编辑配置', value: 'edit' },
        { name: '🗑️  删除配置', value: 'delete' },
        { name: '⬅️  返回主菜单', value: 'back' }
      ]
    }
  ]);

  switch (action) {
    case 'add':
      await addApiConfig(configs);
      break;
    case 'view':
      await viewApiConfigs(configs);
      break;
    case 'edit':
      await editApiConfig(configs);
      break;
    case 'delete':
      await deleteApiConfig(configs);
      break;
    case 'back':
      return;
  }
}

async function addApiConfig(configs) {
  console.log(chalk.bold.cyan('\n➕ 添加新的API配置\n'));

  const { apiType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'apiType',
      message: '请选择API类型:',
      choices: [
        { name: '🤖 Claude (Anthropic)', value: 'claude' },
        { name: '🌙 Kimi (Moonshot)', value: 'claude_kimi' },
        { name: '🧠 智谱AI (Zhipu)', value: 'claude_zhipu' },
        { name: '🔍 Deepseek', value: 'claude_deepseek' },
        { name: '🔮 Gemini (Google)', value: 'gemini' }
      ]
    }
  ]);

  const config = await getApiConfigByType(apiType);

  if (config) {
    configs.environments.push(config);

    if (saveConfigs(configs)) {
      console.log(chalk.green('\n✓ API配置添加成功!'));
      console.log(chalk.gray(`配置名称: ${config.name}`));
      console.log(chalk.gray(`API类型: ${apiType}`));
    } else {
      console.log(chalk.red('\n✗ 保存配置失败'));
    }
  }
}

async function getApiConfigByType(apiType) {
  const baseConfig = {
    name: '',
    type: apiType,
    description: ''
  };

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '请输入配置名称:',
      validate: (input) => input.trim() ? true : '配置名称不能为空'
    },
    {
      type: 'input',
      name: 'description',
      message: '请输入配置描述 (可选):',
      default: ''
    }
  ]);

  baseConfig.name = answers.name;
  baseConfig.description = answers.description;

  // 根据API类型添加特定配置
  switch (apiType) {
    case 'claude':
      return await getClaudeConfig(baseConfig);
    case 'claude_kimi':
      return await getClaudeKimiConfig(baseConfig);
    case 'claude_zhipu':
      return await getClaudeZhipuConfig(baseConfig);
    case 'claude_deepseek':
      return await getClaudeDeepseekConfig(baseConfig);
    case 'gemini':
      return await getGeminiConfig(baseConfig);
    default:
      return null;
  }
}

async function getClaudeKimiConfig(baseConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入Kimi API Key:',
      validate: (input) => input.trim() ? true : 'API Key不能为空'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: '请输入API Base URL:',
      default: 'https://api.moonshot.cn/anthropic'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入默认模型 (可选):',
      default: 'kimi-k2-turbo-preview'
    }
  ]);

  const config = {
    ...baseConfig,
    type: 'claude',
    ANTHROPIC_API_KEY: answers.apiKey,
    ANTHROPIC_BASE_URL: answers.baseUrl
  };

  if (answers.model && answers.model.trim()) {
    config.ANTHROPIC_MODEL = answers.model;
    config.ANTHROPIC_SMALL_FAST_MODEL = answers.model;
  }

  return config;
}

async function getClaudeZhipuConfig(baseConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入智谱AI API Key:',
      validate: (input) => input.trim() ? true : 'API Key不能为空'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: '请输入API Base URL:',
      default: 'https://open.bigmodel.cn/api/anthropic'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入默认模型 (可选):',
      default: 'glm-4.5-air'
    }
  ]);

  const config = {
    ...baseConfig,
    type: 'claude',
    ANTHROPIC_API_KEY: answers.apiKey,
    ANTHROPIC_BASE_URL: answers.baseUrl
  };

  if (answers.model && answers.model.trim()) {
    config.ANTHROPIC_MODEL = answers.model;
    config.ANTHROPIC_SMALL_FAST_MODEL = answers.model;
  }

  return config;
}

async function getClaudeDeepseekConfig(baseConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入Deepseek API Key:',
      validate: (input) => input.trim() ? true : 'API Key不能为空'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: '请输入API Base URL:',
      default: 'https://api.deepseek.com/anthropic/anthropic'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入默认模型 (可选):',
      default: 'deepseek-chat'
    }
  ]);

  const config = {
    ...baseConfig,
    type: 'claude',
    ANTHROPIC_API_KEY: answers.apiKey,
    ANTHROPIC_BASE_URL: answers.baseUrl
  };

  if (answers.model && answers.model.trim()) {
    config.ANTHROPIC_MODEL = answers.model;
    config.ANTHROPIC_SMALL_FAST_MODEL = answers.model;
  }

  return config;
}

async function getClaudeConfig(baseConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入Claude API Key:',
      validate: (input) => input.trim() ? true : 'API Key不能为空'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: '请输入API Base URL:',
      default: 'https://api.anthropic.com'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入默认模型 (可选):',
      default: 'claude-3-5-sonnet-20241022'
    }
  ]);

  const config = {
    ...baseConfig,
    ANTHROPIC_API_KEY: answers.apiKey,
    ANTHROPIC_BASE_URL: answers.baseUrl
  };

  if (answers.model && answers.model.trim()) {
    config.ANTHROPIC_MODEL = answers.model;
    config.ANTHROPIC_SMALL_FAST_MODEL = answers.model;
  }

  return config;
}

async function getGeminiConfig(baseConfig) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '请输入Gemini API Key:',
      validate: (input) => input.trim() ? true : 'API Key不能为空'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入默认模型 (可选):',
      default: 'gemini-2.5-pro'
    }
  ]);

  const config = {
    ...baseConfig,
    GEMINI_API_KEY: answers.apiKey
  };

  if (answers.model && answers.model.trim()) {
    config.GEMINI_MODEL = answers.model;
  }

  return config;
}

async function viewApiConfigs(configs) {
  console.log(chalk.bold.cyan('\n📋 当前API配置\n'));

  if (!configs.environments || configs.environments.length === 0) {
    console.log(chalk.yellow('暂无API配置'));
    return;
  }

  configs.environments.forEach((env, index) => {
    console.log(chalk.blue(`[${index + 1}] ${env.name}`));
    console.log(chalk.gray(`   类型: ${env.type}`));
    if (env.description) {
      console.log(chalk.gray(`   描述: ${env.description}`));
    }

    // 显示关键配置信息（隐藏敏感信息）
    const apiKeyField = getApiKeyField(env.type);
    if (env[apiKeyField]) {
      const maskedKey = env[apiKeyField].substring(0, 8) + '...' + env[apiKeyField].substring(env[apiKeyField].length - 4);
      console.log(chalk.gray(`   API Key: ${maskedKey}`));
    }

    const baseUrlField = getBaseUrlField(env.type);
    if (env[baseUrlField]) {
      console.log(chalk.gray(`   Base URL: ${env[baseUrlField]}`));
    }

    const modelField = getModelField(env.type);
    if (env[modelField]) {
      console.log(chalk.gray(`   模型: ${env[modelField]}`));
    }

    console.log('');
  });

  console.log(chalk.gray('按回车键继续...'));
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: '',
      prefix: ''
    }
  ]);
}

async function editApiConfig(configs) {
  if (!configs.environments || configs.environments.length === 0) {
    console.log(chalk.yellow('暂无API配置可编辑'));
    return;
  }

  const choices = configs.environments.map((env, index) => ({
    name: `${env.name} (${env.type})`,
    value: index
  }));

  const { selectedIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedIndex',
      message: '请选择要编辑的配置:',
      choices
    }
  ]);

  const selectedEnv = configs.environments[selectedIndex];
  console.log(chalk.bold.cyan(`\n✏️ 编辑配置: ${selectedEnv.name}\n`));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '配置名称:',
      default: selectedEnv.name
    },
    {
      type: 'input',
      name: 'description',
      message: '配置描述:',
      default: selectedEnv.description || ''
    }
  ]);

  selectedEnv.name = answers.name;
  selectedEnv.description = answers.description;

  // 编辑API特定配置
  const apiKeyField = getApiKeyField(selectedEnv.type);
  const baseUrlField = getBaseUrlField(selectedEnv.type);
  const modelField = getModelField(selectedEnv.type);

  const apiAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      default: selectedEnv[apiKeyField] ? '***' : ''
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL:',
      default: selectedEnv[baseUrlField] || getDefaultBaseUrl(selectedEnv.type)
    },
    {
      type: 'input',
      name: 'model',
      message: '默认模型 (可选):',
      default: selectedEnv[modelField] || getDefaultModel(selectedEnv.type)
    }
  ]);

  if (apiAnswers.apiKey !== '***') {
    selectedEnv[apiKeyField] = apiAnswers.apiKey;
  }
  selectedEnv[baseUrlField] = apiAnswers.baseUrl;

  if (apiAnswers.model && apiAnswers.model.trim()) {
    selectedEnv[modelField] = apiAnswers.model;
  } else {
    delete selectedEnv[modelField];
  }

  if (saveConfigs(configs)) {
    console.log(chalk.green('\n✓ 配置更新成功!'));
  } else {
    console.log(chalk.red('\n✗ 保存配置失败'));
  }
}

async function deleteApiConfig(configs) {
  if (!configs.environments || configs.environments.length === 0) {
    console.log(chalk.yellow('暂无API配置可删除'));
    return;
  }

  const choices = configs.environments.map((env, index) => ({
    name: `${env.name} (${env.type})`,
    value: index
  }));

  const { selectedIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedIndex',
      message: '请选择要删除的配置:',
      choices
    }
  ]);

  const selectedEnv = configs.environments[selectedIndex];

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确定要删除配置 "${selectedEnv.name}" 吗?`,
      default: false
    }
  ]);

  if (confirm) {
    configs.environments.splice(selectedIndex, 1);

    if (saveConfigs(configs)) {
      console.log(chalk.green('\n✓ 配置删除成功!'));
    } else {
      console.log(chalk.red('\n✗ 删除配置失败'));
    }
  } else {
    console.log(chalk.gray('取消删除操作'));
  }
}

function getApiKeyField(apiType) {
  const fieldMap = {
    claude: 'ANTHROPIC_API_KEY',
    claude_kimi: 'ANTHROPIC_API_KEY',
    claude_zhipu: 'ANTHROPIC_API_KEY',
    claude_deepseek: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY'
  };
  return fieldMap[apiType] || 'API_KEY';
}

function getBaseUrlField(apiType) {
  const fieldMap = {
    claude: 'ANTHROPIC_BASE_URL',
    claude_kimi: 'ANTHROPIC_BASE_URL',
    claude_zhipu: 'ANTHROPIC_BASE_URL',
    claude_deepseek: 'ANTHROPIC_BASE_URL',
    gemini: 'GEMINI_BASE_URL'
  };
  return fieldMap[apiType] || 'BASE_URL';
}

function getModelField(apiType) {
  const fieldMap = {
    claude: 'ANTHROPIC_MODEL',
    claude_kimi: 'ANTHROPIC_MODEL',
    claude_zhipu: 'ANTHROPIC_MODEL',
    claude_deepseek: 'ANTHROPIC_MODEL',
    gemini: 'GEMINI_MODEL'
  };
  return fieldMap[apiType] || 'MODEL';
}

function getDefaultBaseUrl(apiType) {
  const defaultUrls = {
    claude: 'https://api.anthropic.com',
    claude_kimi: 'https://api.moonshot.cn/anthropic',
    claude_zhipu: 'https://open.bigmodel.cn/api/anthropic',
    claude_deepseek: 'https://api.deepseek.com/anthropic',
    gemini: 'https://generativelanguage.googleapis.com'
  };
  return defaultUrls[apiType] || '';
}

function getDefaultModel(apiType) {
  const defaultModels = {
    claude: 'claude-3-5-sonnet-20241022',
    claude_kimi: 'kimi-k2-turbo-preview',
    claude_zhipu: 'glm-4',
    claude_deepseek: 'deepseek-chat',
    gemini: 'gemini-2.5-pro'
  };
  return defaultModels[apiType] || '';
}
