### 新增了一部分库，参考AIsummarizer.ts标红进行下载。

## Technical requirements

E.g. The operating environment and tech stack that you'll use for developing and executing the deliverables

1. 利用 VSCode 的 TreeView 和 Webview API，可以构建一个侧边栏或独立面板来展示分层次的课程目录和进度信息。采用本地存储或简单数据库记录用户进度，开发成本较低。
2. 利用 VSCode 的 TextDocument API，可以实现基于当前内容的批注或独立笔记面板；
数据同步到简单云端进行存储，使用md5码进行校验及与其他用户进行同步。
3. 利用VSCode的workspace、windowAPI、调用terminal方法，可以实现代码的编辑和运行。
4. 利用Live Share API实现文件内容的实时同步；OAuth用于安全认证，JWT管理用户会话，确保文件上传和访问控制的安全性