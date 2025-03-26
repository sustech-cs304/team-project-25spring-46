import * as vscode from 'vscode';

// 自定义树节点类
export class CourseItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}

// 实现 TreeDataProvider 接口
export class CourseTreeDataProvider implements vscode.TreeDataProvider<CourseItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CourseItem | undefined | null | void> = new vscode.EventEmitter<CourseItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CourseItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // 静态的课程列表数据
    private courses: CourseItem[] = [
        new CourseItem('课程1：基础', vscode.TreeItemCollapsibleState.None, {
            command: 'courseIDE.openWebview',
            title: '打开课程详情',
            arguments: [new CourseItem('课程1：基础', vscode.TreeItemCollapsibleState.None)]
        }),
        new CourseItem('课程2：进阶', vscode.TreeItemCollapsibleState.None, {
            command: 'courseIDE.openWebview',
            title: '打开课程详情',
            arguments: [new CourseItem('课程2：进阶', vscode.TreeItemCollapsibleState.None)]
        }),
        new CourseItem('课程3：高级', vscode.TreeItemCollapsibleState.None, {
            command: 'courseIDE.openWebview',
            title: '打开课程详情',
            arguments: [new CourseItem('课程3：高级', vscode.TreeItemCollapsibleState.None)]
        })
    ];

    getTreeItem(element: CourseItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CourseItem): Thenable<CourseItem[]> {
        // 如果 element 为 undefined，则返回根节点数组
        if (!element) {
            return Promise.resolve(this.courses);
        }
        // 当前例子中没有子节点，返回空数组
        return Promise.resolve([]);
    }
}
