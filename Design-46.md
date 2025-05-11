# Design report

# Architectural Design

目前的项目架构分为两个部分：

- 后端项目：主要包含 TypeScript 编写的业务逻辑（比如课程服务、数据库连接）和 Python 脚本
- 前端项目：基于 React + Vite + CSS，实现界面与用户交互

### 🔧 Architecture Diagram

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

### 📄 Natural Language Description

### 📌 系统概述

本系统采用**前后端分离架构**，前端使用 **React + Vite + CSS** 技术栈实现页面展示和用户交互；后端使用 **Node.js + TypeScript** 开发核心业务逻辑与数据处理，前后端通过VSCode提供的Webview API进行通信。部分功能如课件中的代码识别有借助 Python 实现辅助处理。

### 💡 前端模块（vite_test）

前端项目文件结构清晰、组件化开发，主要包含以下模块：

- **入口组件**为 `App.tsx`，内部使用 React Router 实现多页面路由（如 CoursePage、FilePage）。
- **组件目录**中包含多个页面模块和可复用组件。
- `vscodeApi.ts` 封装了前端与 VSCode 插件的交互逻辑（通过 `postMessage` 或 WebView API）。
- 样式由 `Tailwind CSS` 配置完成，构建工具为 `Vite`，保证开发体验和构建效率。

### 🛠 后端模块

后端项目采用 TypeScript 开发，并配合 Python 脚本处理特定任务，

实际运行在 VSCode 插件环境中，主要逻辑包括：

- `extension.ts / extension.js` 是插件的**主入口**，监听前端发来的事件并进行分发处理。
- `courseService.ts` 封装了业务逻辑，例如课程数据管理、与数据库或模型交互等。
- `database.ts` 负责与数据存储层交互（可接入本地文件或轻量数据库）。
- `text_to_code.py` 与 `pdf_test.py` 是 Python 实现的工具模块，负责处理结构化文本、文档抽取或代码生成等高级任务。

### 🔗 通信方式

前端通过 `vscodeApi.ts` 发送消息给插件主进程（`extension.ts`），后端解析后调用对应服务逻辑，并返回结果给前端。通信方式可为：

- `window.postMessage` + `vscode.postMessage`（WebView API）
- JSON 格式数据传递（例如请求类型、参数、响应数据）

### 🛠 数据库设计

- 系统使用MySQL存储关系型数据，主要表包括：
    
    1. **`comments`（评论表）**
    
    | **字段名** | **类型** | **约束** | **描述** |
    | --- | --- | --- | --- |
    | `id` | `SERIAL` | `PRIMARY KEY` | 评论的唯一ID（自增） |
    | `lecture_id` | `TEXT` | `NOT NULL` | 关联的课件名称（外键） |
    | `author` | `TEXT` | `NOT NULL` | 评论作者名称 |
    | `content` | `TEXT` | `NOT NULL` | 评论内容 |
    | `created_at` | `TIMESTAMP` | `NOT NULL DEFAULT NOW()` | 评论创建时间（自动填充当前时间） |
    | `position` | `TEXT` | 无约束 | 评论在文档中的页码位置（可选） |
    
    **外键约束**：`lecture_id` 引用 `lectures(name)`，并设置 `ON DELETE CASCADE`（当讲座被删除时，关联评论自动删除）。
    
    **2. `lectures`（课件表）**
    
    | **字段名** | **类型** | **约束** | **描述** |
    | --- | --- | --- | --- |
    | `id` | `SERIAL` | `PRIMARY KEY` | 课件的唯一ID（自增） |
    | `name` | `TEXT` | `NOT NULL, UNIQUE` | 课件名称（唯一约束） |
    | `url` | `TEXT` | `NOT NULL` | 课件资源的URL |
    | `uploaded_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 课件上传时间（自动填充当前时间） |
    
    对课程进行管理，存储相关的课程信息
    
    3. **`courses`（课程表）**
    
    | **字段名** | **类型** | **约束** | **描述** |
    | --- | --- | --- | --- |
    | `id` | `SERIAL` | `PRIMARY KEY` | 课程的唯一ID（自增） |
    | `name` | `TEXT` | `NOT NULL, UNIQUE` | 课程名称（唯一约束） |
    | `folder_path` | `TEXT` | `NOT NULL` | 课程资源在服务器上的存储路径 |

对具体的课程文件夹进行管理，并保持长久储存

- 实体关系模型：
    
    ![image.png](image.png)
    

### ✅ 架构优势

- **模块化清晰**：前端页面组件与后端服务模块分离，易于维护
- **灵活性高**：Python 与 TypeScript 结合，适配多种处理需求
- **高扩展性**：支持新功能的快速接入（比如添加新页面或服务），与vscode强链接，方便支持代码运行等功能
- **前后端完全独立开发/部署**：提升开发效率，方便进行调试和测试

# UI Design

[UX设计](https://modao.cc/proto/3EsAGTgtsuriv9wjM07wcn/sharing?view_mode=read_only&screen=rbpUiRej30Yfkct0T) #SE UX设计-分