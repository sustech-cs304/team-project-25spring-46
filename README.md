# 使用方法

1. 在根目录下运行"npm install"安装所需的模块
2. 进入vite_test目录，运行"npm install"安装所需的模块
3. 在vite_test目录中运行"npm run dev"可以看见UI Demo（可选）
4. 在vite_test目录中运行"npm run build"会生成dist文件夹，将其复制并覆盖根目录中的dist即可（可选，目前已经覆盖过）
5. 安装src/pdf_test.py中的所需模组，确保可以运行这个脚本
6. 配置src/python_env.ts, 确保其中的python是安装了对应库的python
7. 配置src/database.ts，确保其中的url是自己电脑上的postgresql
8. 使用如下的sql命令在对应的数据库中创建表：
"CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT NOT NULL
);"
9. 在根目录下运行npm run compile
10. Run and Debug the extension 
11. Control+Shift+p 选择Open Webview即可打开主界面