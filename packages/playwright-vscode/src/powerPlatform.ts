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
import * as http from 'http';

interface PowerPlatformTool {
    name: string;
    displayName: string;
    description: string;
    category: string;
    inputParameters: Array<{
        name: string;
        type: string;
        required: boolean;
        description: string;
    }>;
    outputParameters: Array<{
        name: string;
        type: string;
        description: string;
    }>;
}

interface PowerPlatformAction {
    id: string;
    name: string;
    parameters: Record<string, any>;
    timestamp: Date;
}

export class PowerPlatformIntegration {
    private server: http.Server | undefined;
    private isInitialized = false;
    private readonly port = 8081; // Different from MCP server
    private actions: PowerPlatformAction[] = [];

    initialize(): void {
        if (this.isInitialized) {
            return;
        }

        try {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.listen(this.port, () => {
                console.log(`Power Platform integration server started on port ${this.port}`);
                vscode.window.showInformationMessage(`Power Platform integration enabled on port ${this.port}`);
            });

            this.server.on('error', (error) => {
                console.error('Power Platform server error:', error);
                vscode.window.showErrorMessage(`Power Platform server error: ${error.message}`);
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Power Platform integration:', error);
            vscode.window.showErrorMessage(`Failed to initialize Power Platform integration: ${error}`);
        }
    }

    dispose(): void {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
        this.isInitialized = false;
        console.log('Power Platform integration disposed');
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const url = req.url || '';
        const method = req.method || 'GET';

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (url === '/tools' && method === 'GET') {
                this.handleGetTools(res);
            } else if (url === '/tools/execute' && method === 'POST') {
                this.handleExecuteTool(req, res);
            } else if (url === '/health' && method === 'GET') {
                this.handleHealthCheck(res);
            } else if (url === '/actions' && method === 'GET') {
                this.handleGetActions(res);
            } else if (url === '/manifest' && method === 'GET') {
                this.handleGetManifest(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('Error handling Power Platform request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    private handleGetTools(res: http.ServerResponse): void {
        const tools = this.getAvailableTools();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tools }));
    }

    private handleExecuteTool(req: http.IncomingMessage, res: http.ServerResponse): void {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { toolName, parameters } = JSON.parse(body);
                
                const action: PowerPlatformAction = {
                    id: this.generateActionId(),
                    name: toolName,
                    parameters,
                    timestamp: new Date()
                };

                this.actions.push(action);

                const result = await this.executeTool(toolName, parameters);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    actionId: action.id,
                    result 
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: (error as Error).message 
                }));
            }
        });
    }

    private handleHealthCheck(res: http.ServerResponse): void {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }));
    }

    private handleGetActions(res: http.ServerResponse): void {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ actions: this.actions }));
    }

    private handleGetManifest(res: http.ServerResponse): void {
        const manifest = {
            name: "DarBright Playwright Power Platform Connector",
            version: "1.0.0",
            description: "Playwright automation tools for Power Platform",
            publisher: "DarBot Labs",
            capabilities: {
                supportsWebAutomation: true,
                supportsTesting: true,
                supportsRecording: true,
                supportsTracing: true
            },
            tools: this.getAvailableTools(),
            endpoints: {
                tools: "/tools",
                execute: "/tools/execute",
                health: "/health",
                actions: "/actions"
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
    }

    private getAvailableTools(): PowerPlatformTool[] {
        return [
            {
                name: "playwright.navigate",
                displayName: "Navigate to Page",
                description: "Navigate to a web page using Playwright",
                category: "Web Automation",
                inputParameters: [
                    {
                        name: "url",
                        type: "string",
                        required: true,
                        description: "The URL to navigate to"
                    },
                    {
                        name: "waitForLoad",
                        type: "boolean",
                        required: false,
                        description: "Wait for page to fully load"
                    }
                ],
                outputParameters: [
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether navigation was successful"
                    },
                    {
                        name: "title",
                        type: "string",
                        description: "Page title after navigation"
                    }
                ]
            },
            {
                name: "playwright.click",
                displayName: "Click Element",
                description: "Click on a web element",
                category: "Web Automation",
                inputParameters: [
                    {
                        name: "selector",
                        type: "string",
                        required: true,
                        description: "CSS selector or locator for the element"
                    },
                    {
                        name: "timeout",
                        type: "number",
                        required: false,
                        description: "Timeout in milliseconds"
                    }
                ],
                outputParameters: [
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether click was successful"
                    }
                ]
            },
            {
                name: "playwright.fillText",
                displayName: "Fill Text Input",
                description: "Fill text into an input field",
                category: "Web Automation",
                inputParameters: [
                    {
                        name: "selector",
                        type: "string",
                        required: true,
                        description: "CSS selector for the input field"
                    },
                    {
                        name: "text",
                        type: "string",
                        required: true,
                        description: "Text to fill into the field"
                    }
                ],
                outputParameters: [
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether text was filled successfully"
                    }
                ]
            },
            {
                name: "playwright.getText",
                displayName: "Get Text Content",
                description: "Extract text content from an element",
                category: "Web Automation",
                inputParameters: [
                    {
                        name: "selector",
                        type: "string",
                        required: true,
                        description: "CSS selector for the element"
                    }
                ],
                outputParameters: [
                    {
                        name: "text",
                        type: "string",
                        description: "The extracted text content"
                    },
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether text extraction was successful"
                    }
                ]
            },
            {
                name: "playwright.screenshot",
                displayName: "Take Screenshot",
                description: "Capture a screenshot of the page or element",
                category: "Testing",
                inputParameters: [
                    {
                        name: "selector",
                        type: "string",
                        required: false,
                        description: "CSS selector for specific element (optional)"
                    },
                    {
                        name: "path",
                        type: "string",
                        required: false,
                        description: "Path to save screenshot (optional)"
                    }
                ],
                outputParameters: [
                    {
                        name: "path",
                        type: "string",
                        description: "Path where screenshot was saved"
                    },
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether screenshot was taken successfully"
                    }
                ]
            },
            {
                name: "playwright.waitForElement",
                displayName: "Wait for Element",
                description: "Wait for an element to appear on the page",
                category: "Web Automation",
                inputParameters: [
                    {
                        name: "selector",
                        type: "string",
                        required: true,
                        description: "CSS selector for the element to wait for"
                    },
                    {
                        name: "timeout",
                        type: "number",
                        required: false,
                        description: "Timeout in milliseconds (default: 30000)"
                    }
                ],
                outputParameters: [
                    {
                        name: "found",
                        type: "boolean",
                        description: "Whether the element was found"
                    },
                    {
                        name: "success",
                        type: "boolean",
                        description: "Whether the wait was successful"
                    }
                ]
            }
        ];
    }

    private async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
        // This would integrate with the actual Playwright execution
        // For now, return a mock response
        switch (toolName) {
            case 'playwright.navigate':
                return { 
                    success: true, 
                    title: 'Mock Page Title',
                    message: `Navigated to ${parameters.url}` 
                };
            case 'playwright.click':
                return { 
                    success: true,
                    message: `Clicked element: ${parameters.selector}` 
                };
            case 'playwright.fillText':
                return { 
                    success: true,
                    message: `Filled text '${parameters.text}' into ${parameters.selector}` 
                };
            case 'playwright.getText':
                return { 
                    text: 'Mock extracted text',
                    success: true 
                };
            case 'playwright.screenshot':
                return { 
                    path: parameters.path || '/tmp/screenshot.png',
                    success: true 
                };
            case 'playwright.waitForElement':
                return { 
                    found: true,
                    success: true 
                };
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private generateActionId(): string {
        return 'action-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}