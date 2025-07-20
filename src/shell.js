
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

function getShellConfig() {
    const homeDir = os.homedir();
    const zshrcPath = path.join(homeDir, '.zshrc');
    const bashrcPath = path.join(homeDir, '.bashrc');

    if (fs.existsSync(zshrcPath)) {
        return { path: zshrcPath, type: 'zsh' };
    }
    if (fs.existsSync(bashrcPath)) {
        return { path: bashrcPath, type: 'bash' };
    }
    // Default to .zshrc if neither exists
    return { path: zshrcPath, type: 'zsh' };
}

export function readGeminiKey() {
    const { path: shellConfigPath } = getShellConfig();
    if (!fs.existsSync(shellConfigPath)) {
        return null;
    }
    const content = fs.readFileSync(shellConfigPath, 'utf8');
    const regex = /^(?:export\s+)?GEMINI_API_KEY=(.*)$/m;
    const match = content.match(regex);
    return match ? match[1].replace(/['"]/g, '') : null;
}

export function writeGeminiKey(newKey) {
    const { path: shellConfigPath } = getShellConfig();
    let content = '';
    if (fs.existsSync(shellConfigPath)) {
        content = fs.readFileSync(shellConfigPath, 'utf8');
    } else {
        console.log(chalk.yellow(`未找到 shell 配置文件, 将在 ${shellConfigPath} 中创建配置。`));
    }

    const regex = /^(export\s+GEMINI_API_KEY=)(.*)$/m;
    const keyLine = `export GEMINI_API_KEY="${newKey}"`;

    if (regex.test(content)) {
        content = content.replace(regex, keyLine);
    } else {
        content += `\n\n# Added by claude-code-config\n${keyLine}\n`;
    }

    fs.writeFileSync(shellConfigPath, content, 'utf8');
    console.log(chalk.green(`\n✓ Gemini API Key 已成功更新到 ${shellConfigPath}`));
    console.log(chalk.yellow(`\n请运行以下命令使配置生效:`));
    console.log(chalk.cyan(`  source ${shellConfigPath}`));
}
