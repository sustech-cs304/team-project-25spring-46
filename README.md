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
12. 若要运行AI模块，请打开AISummarizer模块并替换您自己的APIkey
13. 若要运行评论的server：运行"npm install -g ts-node"安装模块，在serverDatabase中更改server的数据库连接，然后"ts-node src/server.ts"运行server（可在commentService.ts中更改Server_IP和Port）
14. Control+Shift+p 可选择 测试增添/获取/删除评论