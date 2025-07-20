
import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import chalk from 'chalk';

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
