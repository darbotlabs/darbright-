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
import * as fs from 'fs';
import * as path from 'path';

export class PlaywrightTestProvider implements vscode.TreeDataProvider<TestItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestItem | undefined | null | void> = new vscode.EventEmitter<TestItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{spec,test}.{js,ts}');
        watcher.onDidChange(() => this.refresh());
        watcher.onDidCreate(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TestItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TestItem): Thenable<TestItem[]> {
        if (!element) {
            return this.getTestFiles();
        } else {
            return this.getTestsInFile(element.resourceUri);
        }
    }

    private async getTestFiles(): Promise<TestItem[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const testFiles: TestItem[] = [];
        
        for (const folder of workspaceFolders) {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, '**/*.{spec,test}.{js,ts}'),
                '**/node_modules/**'
            );
            
            files.forEach(file => {
                const relativePath = vscode.workspace.asRelativePath(file);
                testFiles.push(new TestItem(
                    path.basename(file.path),
                    vscode.TreeItemCollapsibleState.Collapsed,
                    file,
                    'testFile'
                ));
            });
        }

        return testFiles;
    }

    private async getTestsInFile(fileUri: vscode.Uri): Promise<TestItem[]> {
        try {
            const content = fs.readFileSync(fileUri.fsPath, 'utf8');
            const tests: TestItem[] = [];
            
            // Simple regex to find test declarations - could be improved with AST parsing
            const testRegex = /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;
            
            while ((match = testRegex.exec(content)) !== null) {
                tests.push(new TestItem(
                    match[1],
                    vscode.TreeItemCollapsibleState.None,
                    fileUri,
                    'test'
                ));
            }

            return tests;
        } catch (error) {
            console.error('Error reading test file:', error);
            return [];
        }
    }
}

class TestItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly type: 'testFile' | 'test'
    ) {
        super(label, collapsibleState);
        
        this.contextValue = type;
        
        if (type === 'testFile') {
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.tooltip = `Test file: ${this.label}`;
        } else {
            this.iconPath = new vscode.ThemeIcon('play');
            this.tooltip = `Test: ${this.label}`;
            this.command = {
                command: 'vscode.open',
                title: 'Open',
                arguments: [this.resourceUri]
            };
        }
    }
}