
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const geminiDir = path.join(os.homedir(), '.gemini');
const geminiEnvPath = path.join(geminiDir, '.env');
const keyName = 'GEMINI_API_KEY';
const keyRegex = new RegExp(`^\\s*(?:export\\s+)?${keyName}\\s*=\\s*(.*)$`);

function ensureGeminiDir() {
    if (!fs.existsSync(geminiDir)) {
        fs.mkdirSync(geminiDir, { recursive: true });
    }
}

function stripQuotes(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).replace(/\\(["'\\])/g, '$1');
    }
    return trimmed;
}

function formatKeyLine(newKey) {
    const escaped = newKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${keyName}="${escaped}"`;
}

export function readGeminiKey() {
    if (!fs.existsSync(geminiEnvPath)) {
        return null;
    }

    const content = fs.readFileSync(geminiEnvPath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const match = line.match(keyRegex);
        if (match) {
            return stripQuotes(match[1]);
        }
    }

    return null;
}

export function writeGeminiKey(newKey) {
    ensureGeminiDir();

    let lines = [];
    if (fs.existsSync(geminiEnvPath)) {
        const content = fs.readFileSync(geminiEnvPath, 'utf8');
        lines = content.split(/\r?\n/);
    } else {
        console.log(chalk.yellow(`未找到 Gemini 环境配置文件，将在 ${geminiEnvPath} 中创建文件。`));
    }

    if (lines.length === 1 && lines[0].trim() === '') {
        lines = [];
    }

    let updated = false;
    lines = lines.map(line => {
        if (keyRegex.test(line)) {
            updated = true;
            return formatKeyLine(newKey);
        }
        return line;
    });

    if (!updated) {
        if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
            lines.push('');
        }
        lines.push('# Managed by claude-code-config');
        lines.push(formatKeyLine(newKey));
    }

    const newContent = lines.join('\n').replace(/\s*$/, '') + '\n';
    fs.writeFileSync(geminiEnvPath, newContent, 'utf8');

    console.log(chalk.green(`\n✓ Gemini API Key 已成功更新到 ${geminiEnvPath}`));
    console.log(chalk.gray(`\n无需执行 source 命令，新密钥会在下次使用 Gemini CLI 时自动读取。`));
}
