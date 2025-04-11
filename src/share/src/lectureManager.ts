import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
// commend line run: npm install axios
import * as FormData from 'form-data';
// commend line run: npm install form-data

export async function uploadLecture() {
  const uris = await vscode.window.showOpenDialog({ canSelectFiles: true });
  if (!uris) {return;}

  const formData = new FormData();
  formData.append('lecture', fs.createReadStream(uris[0].fsPath));

  const res = await axios.post('http://localhost:3000/api/lectures/upload', formData, {
    headers: formData.getHeaders()
  });

  vscode.window.showInformationMessage('课件上传成功: ' + res.data.name);
}

// export async function fetchLectureList(): Promise<{ name: string, url: string }[]> {
//   const res = await axios.get('http://localhost:3000/api/lectures');
//   return res.data;
// }

export async function fetchLectureList(): Promise<Array<{ name: string, url: string }>> {
    try {
      const res = await axios.get('http://localhost:3000/api/lectures');
      return res.data;
    } catch (err) {
      console.error('获取课件列表出错:', err);
      // throw err; 
      // 或者 return []; 表示空列表
      return [];
    }
  }