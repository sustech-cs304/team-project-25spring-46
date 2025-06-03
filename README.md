# Course Aware IDE - VSCode Extension

Course Aware IDE 是一个强大的 VSCode 扩展，旨在为教育工作者和学生提供更好的课程管理和学习体验。本扩展支持课程资源管理、课件查看、代码分析等功能。

## 主要功能

- 📚 课程管理：轻松管理多门课程及其相关资源
- 📄 课件查看：支持PDF课件在线查看和注释
- 💬 评论系统：支持在课件上添加、查看和管理评论
- 🤖 AI辅助：集成AI功能，提供智能摘要和代码分析
- 🔍 代码识别：自动识别课件中的代码片段
- 💬 聊天系统：支持私聊和建立多人群聊

## 快速开始

### 系统要求
- VSCode 1.60.0 或更高版本
- Node.js 14.0.0 或更高版本
- Python 3.8 或更高版本
- PostgreSQL 数据库

### 安装步骤
1. 克隆或直接下载项目到本地
2. 在根目录下运行`build.bat`以构建并编译插件
3. 在vscode中debug界面执行`run extension`以打开含插件的界面

### 使用方法
1. 在 VSCode 中按 `Ctrl+Shift+P`（Windows/Linux）或 `Cmd+Shift+P`（Mac）
2. 输入 "Open Webview" 打开主界面
3. 在主界面中可以：
   - 添加和管理课程
   - 上传和查看课件
   - 添加评论和笔记
   - 自动识别PDF课件中的代码模块和运行
   - 使用 AI 功能进行智能分析
   - 添加和管理学习任务
   - 私聊好友和创建群聊

### AI 功能配置
1. 打开 `AISummarizer` 模块
2. 替换为您自己的 API key 和 API BASE URL
3. 重启扩展以应用更改

## 📝 常见问题
1. 如果遇到模块加载错误，请确保所有依赖都已正确安装
2. 如果 AI 功能无法使用，请确认 API key 和 API BASE URL 配置正确

## 🤝 贡献指南
欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。在提交代码前，请确保：
1. 代码符合项目的编码规范
2. 添加了必要的测试
3. 更新了相关文档


<!-- ## 使用方式
1. 在根目录下运行"npm install"安装所需的模块
2. 进入vite_test目录，运行"npm install"安装所需的模块
3. 在vite_test目录中运行"npm run dev"可以看见UI Demo（可
选）
4. 在vite_test目录中运行"npm run build"会生成dist文件夹，
将其复制并覆盖根目录中的dist即可（可选，目前已经覆盖过）
5. 安装src/pdf_test.py中的所需模组，确保可以运行这个脚本
6. 配置src/python_env.ts, 确保其中的python是安装了对应库的
python
7. 配置src/database.ts，确保其中的url是自己电脑上的
postgresql
8. 使用如下的sql命令在对应的数据库中创建表：
"CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL
);"
9. 在根目录下运行npm run compile
10. Run and Debug the extension 
11. Control+Shift+p 选择Open Webview即可打开主界面
12. 若要运行AI模块，请打开AISummarizer模块并替换您自己的
APIkey
13. 若要运行评论的server：运行"npm install -g ts-node"安装
模块，在serverDatabase中更改server的数据库连接，然后"ts-
node src/server.ts"运行server（可在commentService.ts中更
改Server_IP和Port）
14. Control+Shift+p 可选择 测试增添/获取/删除评论 -->