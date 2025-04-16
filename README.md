# 打开项目教程
1. 下载nodejs

2. clone仓库

3. cd进入目录，运行 "npm install" 命令

4. 运行"npm run compile"

5. 在bd.js将相关信息改为自己的数据库，建表语句：
    CREATE TABLE lectures (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      position TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT lecture_name_id FOREIGN KEY (lecture_id)
        REFERENCES lectures(name)
        ON DELETE CASCADE
    );

6. 运行服务器"node src/share/backend/server.js"（注意server.js的路径）

7. 使用vscode打开目录，按F5进行调试

8. 在打开的新窗口的按"control + shift + p"，输入"共享课件评论"，回车即可测试评论功能
