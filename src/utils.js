import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import chalk from 'chalk';
import { promisify } from 'util';
import https from 'https';

const execAsync = promisify(exec);

export function parseArgs() {
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
            options.projectPath = path.resolve(args[i]);
            options.isProject = true;
        }
    }

    return options;
}

export function getClaudeConfigPaths(isProject, projectPath) {
    const configDir = path.join(os.homedir(), '.claude-code-config');
    const configPath = path.join(configDir, 'configs.json');

    if (isProject) {
        const settingsPath = path.join(projectPath, '.claude', 'settings.json');
        return {
            settingsPath,
            configDir,
            configPath,
            type: 'project',
            location: projectPath
        };
    } else {
        const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
        return {
            settingsPath,
            configDir,
            configPath,
            type: 'global',
            location: os.homedir()
        };
    }
}

export async function openWithEditor(filePath) {
    const editors = ['cursor', 'code'];

    for (const editor of editors) {
        try {
            await new Promise((resolve, reject) => {
                exec(`which ${editor}`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            console.log(chalk.blue(`\n🚀 使用 ${editor} 打开配置文件...`));
            spawn(editor, [filePath], { detached: true, stdio: 'ignore' }).unref();
            console.log(chalk.green(`✓ 已在 ${editor} 中打开: ${filePath}`));
            return true;

        } catch (error) {
            continue;
        }
    }

    console.log(chalk.yellow('\n⚠️  未找到 cursor 或 code 编辑器'));
    console.log(chalk.blue(`📁 配置文件位置: ${filePath}`));
    console.log(chalk.gray('请手动使用文本编辑器打开上述文件进行编辑'));
    return false;
}

/**
 * 获取npm包的最新版本
 * @param {string} packageName - 包名
 * @returns {Promise<string|null>} 最新版本号或null
 */
export async function getLatestVersion(packageName) {
  try {
    return new Promise((resolve, reject) => {
      const url = `https://registry.npmjs.org/${packageName}/latest`;

      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.version);
          } catch (error) {
            reject(new Error('解析版本信息失败'));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('获取最新版本失败:', error.message);
    return null;
  }
}

/**
 * 比较版本号
 * @param {string} currentVersion - 当前版本
 * @param {string} latestVersion - 最新版本
 * @returns {number} 1表示有新版本，0表示相同，-1表示当前版本更新
 */
export function compareVersions(currentVersion, latestVersion) {
  const current = currentVersion.split('.').map(Number);
  const latest = latestVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const currentPart = current[i] || 0;
    const latestPart = latest[i] || 0;

    if (currentPart > latestPart) return -1;
    if (currentPart < latestPart) return 1;
  }

  return 0;
}

/**
 * 检查更新
 * @param {string} packageName - 包名
 * @param {string} currentVersion - 当前版本
 * @returns {Promise<{hasUpdate: boolean, latestVersion: string|null, currentVersion: string}>}
 */
export async function checkForUpdates(packageName, currentVersion) {
  try {
    const latestVersion = await getLatestVersion(packageName);

    if (!latestVersion) {
      return {
        hasUpdate: false,
        latestVersion: null,
        currentVersion,
      };
    }

    const comparison = compareVersions(currentVersion, latestVersion);

    return {
      hasUpdate: comparison === 1,
      latestVersion,
      currentVersion,
    };
  } catch (error) {
    console.error('检查更新失败:', error.message);
    return {
      hasUpdate: false,
      latestVersion: null,
      currentVersion,
    };
  }
}

/**
 * 显示更新提示
 * @param {string} packageName - 包名
 * @param {string} currentVersion - 当前版本
 * @param {string} latestVersion - 最新版本
 */
export function showUpdatePrompt(packageName, currentVersion, latestVersion) {
  console.log(chalk.yellow('\n📦 发现新版本可用!'));
  console.log(chalk.gray(`   当前版本: ${currentVersion}`));
  console.log(chalk.green(`   最新版本: ${latestVersion}`));
  console.log(chalk.cyan(`   更新命令: npm install -g ${packageName}@latest`));
  console.log(chalk.gray('   或者运行: npm update -g ${packageName}'));
  console.log('');
}
