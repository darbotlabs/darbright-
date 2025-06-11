/**
 * Copyright (c) DarBot Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from 'vscode';
import { PlaywrightTestProvider } from './testProvider';
import { MCPServer } from './mcpServer';
import { PowerPlatformIntegration } from './powerPlatform';

export function activate(context: vscode.ExtensionContext) {
    console.log('DarBright Playwright extension is now active!');

    // Initialize test provider
    const testProvider = new PlaywrightTestProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('darbrightPlaywrightTests', testProvider)
    );

    // Initialize MCP server if enabled
    const config = vscode.workspace.getConfiguration('darbright-playwright');
    let mcpServer: MCPServer | undefined;
    
    if (config.get('mcpEnabled')) {
        mcpServer = new MCPServer(config.get('mcpPort') || 8080);
        mcpServer.start();
    }

    // Initialize Power Platform integration if enabled
    let powerPlatform: PowerPlatformIntegration | undefined;
    if (config.get('powerPlatformEnabled')) {
        powerPlatform = new PowerPlatformIntegration();
        powerPlatform.initialize();
    }

    // Register commands
    const commands = [
        vscode.commands.registerCommand('darbright-playwright.showCommands', () => {
            vscode.commands.executeCommand('workbench.action.showCommands');
        }),

        vscode.commands.registerCommand('darbright-playwright.installPlaywright', async () => {
            const terminal = vscode.window.createTerminal('DarBright Playwright');
            terminal.show();
            terminal.sendText('npm install @playwright/test');
            terminal.sendText('npx playwright install');
        }),

        vscode.commands.registerCommand('darbright-playwright.recordTest', async () => {
            const terminal = vscode.window.createTerminal('DarBright Playwright Recorder');
            terminal.show();
            terminal.sendText('npx playwright codegen');
        }),

        vscode.commands.registerCommand('darbright-playwright.runTests', async () => {
            const terminal = vscode.window.createTerminal('DarBright Playwright Tests');
            terminal.show();
            terminal.sendText('npx playwright test');
        }),

        vscode.commands.registerCommand('darbright-playwright.openTraceViewer', async () => {
            const terminal = vscode.window.createTerminal('DarBright Playwright Trace');
            terminal.show();
            terminal.sendText('npx playwright show-trace');
        }),

        vscode.commands.registerCommand('darbright-playwright.startMCPServer', async () => {
            if (!mcpServer) {
                mcpServer = new MCPServer(config.get('mcpPort') || 8080);
                mcpServer.start();
                vscode.window.showInformationMessage('MCP Server started');
            } else {
                vscode.window.showInformationMessage('MCP Server is already running');
            }
        })
    ];

    context.subscriptions.push(...commands);

    // Watch for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('darbright-playwright')) {
            const newConfig = vscode.workspace.getConfiguration('darbright-playwright');
            
            // Handle MCP server changes
            if (e.affectsConfiguration('darbright-playwright.mcpEnabled')) {
                if (newConfig.get('mcpEnabled')) {
                    if (!mcpServer) {
                        mcpServer = new MCPServer(newConfig.get('mcpPort') || 8080);
                        mcpServer.start();
                    }
                } else {
                    if (mcpServer) {
                        mcpServer.stop();
                        mcpServer = undefined;
                    }
                }
            }

            // Handle Power Platform changes
            if (e.affectsConfiguration('darbright-playwright.powerPlatformEnabled')) {
                if (newConfig.get('powerPlatformEnabled')) {
                    if (!powerPlatform) {
                        powerPlatform = new PowerPlatformIntegration();
                        powerPlatform.initialize();
                    }
                } else {
                    if (powerPlatform) {
                        powerPlatform.dispose();
                        powerPlatform = undefined;
                    }
                }
            }
        }
    });

    context.subscriptions.push(configWatcher);

    // Clean up on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (mcpServer) {
                mcpServer.stop();
            }
            if (powerPlatform) {
                powerPlatform.dispose();
            }
        }
    });
}

export function deactivate() {
    console.log('DarBright Playwright extension is now deactivated!');
}