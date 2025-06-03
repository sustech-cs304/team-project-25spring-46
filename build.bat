@echo off
call npm install

cd vite_test
call npm install
call npm run build

rmdir /s /q ..\dist
move .\dist ..
cd ..

call npm run compile

call npm run bundle
pause
