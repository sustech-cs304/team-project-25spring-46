// CourseTreeDataProvider.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CourseItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly resourceUri?: vscode.Uri,
        public readonly deadline?: string // Add deadline as an optional property
    ) {
        super(label, collapsibleState);
        if (deadline) {
            this.description = `截止日期: ${deadline}`; // Show deadline in the tree view
        }
    }
}

export class CourseTreeDataProvider implements vscode.TreeDataProvider<CourseItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CourseItem | undefined | null | void> = new vscode.EventEmitter<CourseItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CourseItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private courses: CourseItem[] = [];

    constructor(private context: vscode.ExtensionContext) {
        const storedCourses = context.globalState.get<{ name: string, path: string, deadline?: string }[]>('courses') || [];
        this.courses = storedCourses.map(course => new CourseItem(
            course.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            {
                command: 'courseIDE.openExistingCourse',
                title: '打开课程',
                arguments: [course.path]
            },
            vscode.Uri.file(course.path),
            course.deadline
        ));
    }

    getTreeItem(element: CourseItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CourseItem): Thenable<CourseItem[]> {
        if (!element) {
            return Promise.resolve(this.courses);
        }
        const folderPath = element.resourceUri ? element.resourceUri.fsPath : (element.command?.arguments ? element.command.arguments[0] : undefined);
        if (folderPath) {
            try {
                const fileNames = fs.readdirSync(folderPath);
                const storedFiles = this.context.globalState.get<{ path: string, deadline: string }[]>('filesWithDeadlines') || [];
                const children = fileNames.map((name: string) => {
                    const fullPath = path.join(folderPath, name);
                    const stat = fs.statSync(fullPath);
                    const fileDeadline = storedFiles.find(f => f.path === fullPath)?.deadline;
                    return new CourseItem(
                        name,
                        stat.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        stat.isDirectory() ? {
                            command: 'courseIDE.openExistingCourse',
                            title: '打开文件夹',
                            arguments: [fullPath]
                        } : {
                            command: 'courseIDE.previewFile',
                            title: '预览文件',
                            arguments: [fullPath]
                        },
                        vscode.Uri.file(fullPath),
                        fileDeadline
                    );
                });
                return Promise.resolve(children);
            } catch (error) {
                return Promise.resolve([]);
            }
        }
        return Promise.resolve([]);
    }

    public addCourse(name: string, coursePath: string) {
        let storedCourses = this.context.globalState.get<{ name: string, path: string }[]>('courses') || [];
        if (!storedCourses.find(course => course.path === coursePath)) {
            storedCourses.push({ name, path: coursePath });
            this.context.globalState.update('courses', storedCourses);
            this.courses.push(new CourseItem(
                name,
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    command: 'courseIDE.openExistingCourse',
                    title: '打开课程',
                    arguments: [coursePath]
                },
                vscode.Uri.file(coursePath)
            ));
            this._onDidChangeTreeData.fire();
        }
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }
}