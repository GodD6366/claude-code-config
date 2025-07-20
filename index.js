#!/usr/bin/env node

import { parseArgs, getClaudeConfigPaths } from './src/utils.js';
import { showMainMenu, showUsage, showVersion } from './src/ui.js';

function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        return;
    }

    if (args.includes('--version') || args.includes('-v')) {
        showVersion();
        return;
    }

    const options = parseArgs();
    const claudePaths = getClaudeConfigPaths(options.isProject, options.projectPath);
    
    showMainMenu(claudePaths);
}

main();