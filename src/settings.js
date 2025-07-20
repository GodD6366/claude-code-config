
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// This file is for Claude-specific settings logic.

export function loadSettings(settingsPath) {
    try {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(chalk.yellow(`提示: Claude设置文件 ${settingsPath} 不存在或无效，将创建新的配置文件。`));

        const dir = path.dirname(settingsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const defaultSettings = {
            "permissions": { "allow": [], "deny": [] },
            "env": {}
        };

        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
        console.log(chalk.green(`✓ 已创建默认配置文件: ${settingsPath}`));

        return defaultSettings;
    }
}

export function saveSettings(settings, settingsPath) {
    try {
        const dir = path.dirname(settingsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(chalk.red('错误: 保存设置文件失败'), error.message);
        return false;
    }
}
