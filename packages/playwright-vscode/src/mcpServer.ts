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
import * as WebSocket from 'ws';
import { spawn, ChildProcess } from 'child_process';

interface MCPMessage {
    id?: string;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

interface PlaywrightTool {
    name: string;
    description: string;
    inputSchema: any;
}

export class MCPServer {
    private server: WebSocket.Server | undefined;
    private connections: Set<WebSocket> = new Set();
    private isRunning = false;

    constructor(private port: number) {}

    start(): void {
        if (this.isRunning) {
            return;
        }

        try {
            this.server = new WebSocket.Server({ port: this.port });
            this.isRunning = true;

            this.server.on('connection', (ws: WebSocket) => {
                console.log('MCP client connected');
                this.connections.add(ws);

                ws.on('message', (data: WebSocket.Data) => {
                    this.handleMessage(ws, data);
                });

                ws.on('close', () => {
                    console.log('MCP client disconnected');
                    this.connections.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('MCP WebSocket error:', error);
                    this.connections.delete(ws);
                });

                // Send initial capability advertisement
                this.sendMessage(ws, {
                    method: 'tools/list',
                    result: {
                        tools: this.getAvailableTools()
                    }
                });
            });

            this.server.on('error', (error) => {
                console.error('MCP Server error:', error);
                vscode.window.showErrorMessage(`MCP Server error: ${error.message}`);
            });

            console.log(`MCP Server started on port ${this.port}`);
            vscode.window.showInformationMessage(`MCP Server started on port ${this.port}`);
        } catch (error) {
            console.error('Failed to start MCP server:', error);
            vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
        }
    }

    stop(): void {
        if (!this.isRunning) {
            return;
        }

        if (this.server) {
            this.connections.forEach(ws => ws.close());
            this.connections.clear();
            this.server.close();
            this.server = undefined;
        }

        this.isRunning = false;
        console.log('MCP Server stopped');
        vscode.window.showInformationMessage('MCP Server stopped');
    }

    private handleMessage(ws: WebSocket, data: WebSocket.Data): void {
        try {
            const message: MCPMessage = JSON.parse(data.toString());
            console.log('Received MCP message:', message);

            switch (message.method) {
                case 'tools/list':
                    this.handleToolsList(ws, message);
                    break;
                case 'tools/call':
                    this.handleToolCall(ws, message);
                    break;
                case 'ping':
                    this.sendMessage(ws, {
                        id: message.id,
                        result: { status: 'pong' }
                    });
                    break;
                default:
                    this.sendMessage(ws, {
                        id: message.id,
                        error: { code: -32601, message: 'Method not found' }
                    });
            }
        } catch (error) {
            console.error('Error handling MCP message:', error);
            this.sendMessage(ws, {
                error: { code: -32700, message: 'Parse error' }
            });
        }
    }

    private handleToolsList(ws: WebSocket, message: MCPMessage): void {
        this.sendMessage(ws, {
            id: message.id,
            result: {
                tools: this.getAvailableTools()
            }
        });
    }

    private async handleToolCall(ws: WebSocket, message: MCPMessage): Promise<void> {
        const { name, arguments: args } = message.params;

        try {
            let result;

            switch (name) {
                case 'playwright_run_test':
                    result = await this.runPlaywrightTest(args.testFile, args.options);
                    break;
                case 'playwright_record_test':
                    result = await this.recordPlaywrightTest(args.url, args.outputFile);
                    break;
                case 'playwright_generate_locator':
                    result = await this.generateLocator(args.url, args.selector);
                    break;
                case 'playwright_open_trace':
                    result = await this.openTrace(args.traceFile);
                    break;
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            this.sendMessage(ws, {
                id: message.id,
                result: result
            });
        } catch (error) {
            console.error('Tool call error:', error);
            this.sendMessage(ws, {
                id: message.id,
                error: { code: -32603, message: (error as Error).message }
            });
        }
    }

    private sendMessage(ws: WebSocket, message: MCPMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private getAvailableTools(): PlaywrightTool[] {
        return [
            {
                name: 'playwright_run_test',
                description: 'Run Playwright tests',
                inputSchema: {
                    type: 'object',
                    properties: {
                        testFile: { type: 'string', description: 'Path to test file' },
                        options: { type: 'object', description: 'Test options' }
                    },
                    required: ['testFile']
                }
            },
            {
                name: 'playwright_record_test',
                description: 'Record a new Playwright test',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL to start recording from' },
                        outputFile: { type: 'string', description: 'Output test file path' }
                    },
                    required: ['url']
                }
            },
            {
                name: 'playwright_generate_locator',
                description: 'Generate a locator for an element',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL of the page' },
                        selector: { type: 'string', description: 'Element selector' }
                    },
                    required: ['url', 'selector']
                }
            },
            {
                name: 'playwright_open_trace',
                description: 'Open Playwright trace viewer',
                inputSchema: {
                    type: 'object',
                    properties: {
                        traceFile: { type: 'string', description: 'Path to trace file' }
                    },
                    required: ['traceFile']
                }
            }
        ];
    }

    private runPlaywrightTest(testFile: string, options: any = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            const args = ['playwright', 'test', testFile];
            if (options.headed) args.push('--headed');
            if (options.debug) args.push('--debug');
            if (options.project) args.push('--project', options.project);

            const process: ChildProcess = spawn('npx', args, {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output, exitCode: code });
                } else {
                    resolve({ success: false, output, errorOutput, exitCode: code });
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    private recordPlaywrightTest(url: string, outputFile?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const args = ['playwright', 'codegen', url];
            if (outputFile) args.push('--target', 'playwright-test', '--output', outputFile);

            const process: ChildProcess = spawn('npx', args, {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                stdio: 'pipe'
            });

            let output = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', (code) => {
                resolve({ success: code === 0, output, exitCode: code });
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    private generateLocator(url: string, selector: string): Promise<any> {
        // This would typically use Playwright's locator generation APIs
        // For now, return a basic implementation
        return Promise.resolve({
            success: true,
            locator: `page.locator('${selector}')`,
            suggestions: [
                `page.getByRole('button', { name: '${selector}' })`,
                `page.getByText('${selector}')`,
                `page.locator('${selector}')`
            ]
        });
    }

    private openTrace(traceFile: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const process: ChildProcess = spawn('npx', ['playwright', 'show-trace', traceFile], {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                resolve({ success: code === 0, exitCode: code });
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }
}