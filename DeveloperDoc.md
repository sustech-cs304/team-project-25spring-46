# Developer Documentation – VS Code Extension "Course Aware IDE"

## 系统架构

### 整体架构

系统采用前后端分离架构，主要分为以下几个部分：

1. **前端（vite_test）**
   - 基于 React + Vite + TypeScript
   - 使用 Tailwind CSS 进行样式管理
   - 通过 WebView API 与 VSCode 扩展通信

2. **后端（src）**
   - TypeScript 编写的核心业务逻辑
   - Python 脚本处理特定任务
   - PostgreSQL 数据库存储

3. **VSCode 扩展（根目录）**
   - 作为前后端的桥梁
   - 提供 VSCode API 集成
   - 管理扩展生命周期

### 架构图

```
+----------------+           WebView API / HTTP           +-----------------+
|                |  <---------------------------------->  |                 |
|   Frontend     |                                        |     Backend     |
|  (vite_test)   |                                        | (test-combine)  |
|                |                                        |                 |
+--------+-------+                                        +--------+--------+
         |                                                         |
         |                                                         |
         v                                                         v
+----------------------------+                         +----------------------------+
| React App (App.tsx)        |                         | VSCode Extension (entry)   |
| Pages, Components, Hooks   |                         | extension.ts / .js         |
| vscodeApi.ts (API bridge)  |                         +----------------------------+
+-------------+--------------+                                    |
              |                                                   |
              v                                                   v
+-----------------------------+                     +-----------------------------+
| Tailwind CSS + Vite + TSX   |                     | courseService.ts (业务逻辑) |
+-----------------------------+                     +-----------------------------+
                                                              |
                                                              v
                                             +-----------------------------+
                                             | database.ts (数据访问层)     |
                                             +-----------------------------+
                                                              |
                                                              v
                                             +-----------------------------+
                                             | text_to_code.py, pdf_test.py|
                                             | (文本分析 & PDF 处理)        |
                                             +-----------------------------+
```

## 核心模块说明

### 1. 前端模块 (vite_test/)

#### 主要组件
- `App.tsx`: 应用入口组件
- `components/`: 可复用组件
- `pages/`: 页面组件
- `hooks/`: 自定义 React Hooks
- `services/`: API 服务
- `utils/`: 工具函数

#### 关键文件
- `vscodeApi.ts`: VSCode API 通信封装
- `App.tsx`: 主应用组件
- `index.css`: 全局样式

### 2. 后端模块 (src/)

#### 核心服务

**a. courseService.ts**

课程管理服务，负责处理课程相关的所有操作。

**主要功能**：
1. 课程创建和管理
   - `createNewCourse`: 创建新课程，包括创建课程文件夹结构和数据库记录
   - `getCourses`: 获取所有课程列表
   - `getCourseSubfolderFiles`: 获取课程子文件夹中的文件列表

2. 文件操作
   - `getFileDetails`: 获取文件详细信息（大小、类型、上传时间等）
   - `getFileAbsolutePath`: 获取文件的绝对路径

**2. commentService.ts**

评论服务，处理文件注释和评论功能。

**主要功能**：
1. 评论管理
   - `addComment`: 添加新评论
   - `deleteCommentById`: 删除指定评论
   - `getAllComments`: 获取文件的所有评论
   - `getPageComments`: 获取特定页面的评论

2. 文件处理
   - `hashFilePath`: 生成文件路径的哈希值
   - `hashFileByContent`: 基于文件内容生成哈希值

**数据结构**：
```typescript
interface Comment {
    id: number;
    file_id: string;
    page_number?: number;
    position?: string;
    type: 'text' | 'highlight' | 'underline';
    content?: string;
    extra?: Record<string, any>;
    author?: string;
    created_at: string;
}
```

**3. taskService.ts**

任务管理服务，处理课程任务和项目任务。

**主要功能**：
1. 任务管理
   - `createNewTask`: 创建新任务
   - `getMyTasks`: 获取当前用户的所有任务
   - `getProjectTasks`: 获取项目相关的任务
   - `updateTask`: 更新任务信息
   - `deleteTask`: 删除任务

2. 任务关联
   - 支持任务与课程的关联
   - 支持任务与项目的关联
   - 支持任务分配和状态管理

**数据结构**：
```typescript
interface Task {
    id: number;
    title: string;
    details: string;
    due_date: string;
    priority: string;
    status: string;
    course_id: number;
    project_id: number;
    assignee_id: number;
    feedback?: string;
}
```

**4. AIsummarizer.ts**

AI 功能服务，提供课件总结和测试题生成功能。

**主要功能**：
1. PDF 处理
   - `extractPDFText`: 从 PDF 文件中提取文本内容

2. AI 功能
   - `generateAISummary`: 生成课件总结
   - `generateAIQuiz`: 生成测试题
   - `queryLLM`: 与语言模型交互

**特点**：
- 使用 GPT-4 模型
- 支持 PDF 文本提取
- 包含错误重试机制
- 支持 Markdown 格式输出

**5. projectService.ts**

项目管理服务，处理项目相关的操作。

**主要功能**：
- `getProjects`: 获取所有项目列表
- 项目与任务的关联管理
- 项目状态跟踪

**数据结构**：
```typescript
interface Project {
    id: number;
    name: string;
}
```

#### Python 脚本
- `text_to_code.py`: 文本到代码转换
- `pdf_test.py`: PDF 处理工具

### 3. 数据库设计

#### SupaBase 数据库
放一张图


## API 文档

### 前后端通信接口

本项目前端通过 WebView API 与 VSCode 扩展进行通信，所有通信都通过 `postMessage` 和 `onDidReceiveMessage` 实现。通信采用命令模式，每个命令都有对应的请求和响应格式。

#### 1. 用户认证 API

- 用户登录
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'login',
    name: string,
    email: string,
    password: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'loginResult',
    success: boolean,
    user?: UserInfo,
    error?: string 
  });
  ```

- 用户注册
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'register',
    name: string,
    email: string,
    password: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'registerResult',
    success: boolean,
    user?: UserInfo,
    error?: string 
  });
  ```

- 用户登出
  ```typescript
  // 前端发送
  webview.postMessage({ command: 'logout' });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'logoutResult',
    success: boolean 
  });
  ```

#### 2. 课程管理 API

-  获取课程列表
    ```typescript
    // 前端发送
    webview.postMessage({ command: 'getCourses' });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'coursesData', 
    courses: Course[] 
    });
    ```

- 创建新课程
    ```typescript
    // 前端发送
    webview.postMessage({ command: 'createCourse' });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'createCourseResult', 
    success: boolean,
    data?: Course,
    error?: string 
    });
    ```

- 获取课程文件
    ```typescript
    // 前端发送
    webview.postMessage({ 
    command: 'getCourseFiles',
    courseName: string 
    });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'courseFilesData', 
    files: File[] 
    });
    ```

#### 3. 评论注释系统 API

- 获取所有评论
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'getAllComments',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'commentsData', 
    comments: Comment[] 
  });
  ```

- 添加评论
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'addComment',
    data: {
      filePath: string,
      comment: {
        file_id: string,
        page_number: number,
        position: string,
        type: string,
        content: string,
        extra: any,
        author: string
      }
    }
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'addCommentResult', 
    success: boolean,
    data?: Comment,
    error?: string 
  });
  ```

- 删除评论
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'deleteComments',
    id: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'deleteCommentsSuccess' | 'deleteCommentsError',
    id: string,
    error?: string 
  });
  ```

#### 4. 任务管理 API

- 创建任务
    ```typescript
    // 前端发送
    webview.postMessage({ 
    command: 'createTask',
    data: {
        title: string,
        details: string,
        due_date: string,
        priority: string,
        status: string,
        course_id: number,
        project_id: number
    }
    });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'createTaskResult', 
    success: boolean,
    data?: Task,
    error?: string 
    });
    ```

- 获取我的任务
    ```typescript
    // 前端发送
    webview.postMessage({ command: 'getMyTasks' });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'getMyTasks', 
    tasks: Task[] 
    });
    ```

- 获取项目任务
    ```typescript
    // 前端发送
    webview.postMessage({ command: 'getProjectTasks' });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'projectTasksData', 
    tasks: Task[] 
    });
    ```

- 更新任务
    ```typescript
    // 前端发送
    webview.postMessage({ 
    command: 'updateTask',
    data: {
        id: number,
        title: string,
        details: string,
        due_date: string,
        status: string,
        priority: string,
        course_id: number,
        project_id: number
    }
    });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'updateTaskResult', 
    success: boolean,
    taskId: number,
    error?: string 
    });
    ```

- 删除任务
    ```typescript
    // 前端发送
    webview.postMessage({ 
    command: 'deleteTask',
    taskId: number 
    });

    // 后端响应
    panel?.webview.postMessage({ 
    command: 'deleteTaskResult', 
    success: boolean,
    taskId: number,
    error?: string 
    });
    ```

#### 5. AI 功能 API

- 生成课件总结
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'generateSummary',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'aiSummaryResult', 
    content: string 
  });
  ```

- 生成并保存课件总结
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'generateSummaryAndSave',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'saveSummaryResult',
    success: boolean,
    mdPath?: string,
    error?: string 
  });
  ```

- 生成测试题
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'generateQuiz',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'aiQuizResult', 
    content: string // JSON 格式的测试题数组
  });
  ```

#### 6. 代码识别系统 API

- 运行代码识别
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'runCodeRecognition',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'codeRecognitionResult', 
    codes: Array<{
      path: string,
      content: string
    }> 
  });
  ```

#### 7. PDF文档相关 API

- 获取 PDF 路径
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'getPdfPath',
    path: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'PdfPath', 
    path: string 
  });
  ```

- 获取 PDF Worker 路径
  ```typescript
  // 前端发送
  webview.postMessage({ command: 'getPdfWorkerPath' });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'PdfWorkerPath', 
    path: string 
  });
  ```

- 获取文件详情
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'getFileDetails',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'fileDetailsResult', 
    details: FileDetails 
  });
  ```

- 打开文件
  ```typescript
  // 前端发送
  webview.postMessage({ 
    command: 'openFile',
    filePath: string 
  });

  // 后端响应
  panel?.webview.postMessage({ 
    command: 'pdfCodeBlocks', 
    data: string // JSON 格式的代码块数据
  });
  ```

### 错误处理

所有 API 响应都遵循统一的错误处理格式：
```typescript
{
  command: string;
  success: boolean;
  error?: string;
  data?: any;
}
```

- `command`: 响应对应的命令名称
- `success`: 操作是否成功
- `error`: 如果失败，包含错误信息
- `data`: 如果成功，包含返回的数据

### 安全考虑

1. 所有通信都通过 VSCode 的 WebView API 进行，确保了安全性
2. 实现了内容安全策略（CSP）来限制资源加载
3. 用户认证状态通过 `currentUserId` 进行管理
4. 所有用户输入都经过验证和清理

## 开发指南

### 环境设置

1. 安装依赖
   ```bash
   npm install
   cd vite_test && npm install
   ```

2. 配置 Python 环境
   - 安装 Python 3.8+
   - 安装依赖：`pip install -r requirements.txt`
   - 更新 `src/python_env.ts` 中的 Python 路径

### 开发流程

1. 前端开发
   ```bash
   cd vite_test
   npm run dev
   ```

2. 后端开发
   ```bash
   npm run compile
   ```

3. 调试
   - 使用 VSCode 的调试功能
   - 查看控制台输出
   - 使用 Chrome DevTools 调试 WebView

### 测试

1. 单元测试
   ```bash
   npm run test:backend [--<pathToTestFile>]
   ```

2. 集成测试
   ```bash
   npm run test:backend
   ```

## 部署指南
### 使用的部署技术和方式：

由于本项目为 **Visual Studio Code 插件**，不适用于传统的 Web 服务或后端系统的容器化部署。我们使用如下现代工具和流程完成插件部署：

- **VSCE (Visual Studio Code Extension CLI)**：官方推荐工具，用于将插件打包成 `.vsix` 文件。
- **GitHub**：项目托管在 GitHub 上，便于团队协作和版本管理。
- **Visual Studio Code Marketplace**：支持将插件发布至官方插件市场。
- **命令行安装**：也支持用户通过 `.vsix` 文件手动安装插件，适用于本地部署或调试。

### 部署脚本示例：

```bash
npm install -g @vscode/vsce
vsce package
```

我们已成功打包并安装插件，以下为终端成功打包

```
Created: test-combine-0.0.1.vsix
```