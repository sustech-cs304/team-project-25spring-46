const express = require('express');  // npm install express
const cors = require('cors');        // npm install cors
const multer = require('multer');    // npm install multer
const comments = require('./comments');
const lectures = require('./lectures');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/comments', comments);
app.use('/api/lectures', lectures);

// 监听端口3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});