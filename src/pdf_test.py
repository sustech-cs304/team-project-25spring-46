'''
Author: hatfail 1833943280@qq.com
Date: 2025-03-30 23:27:35
LastEditors: hatfail 1833943280@qq.com
LastEditTime: 2025-04-02 14:15:55
FilePath: pdf_test.py
Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
'''
import pdfplumber
import pdfminer
import os
from PIL import Image
from pdf2image import convert_from_path
import pytesseract

#检查文本是否为代码
#利用关键符号/特殊符号进行匹配，进一步识别编程语言。
#返回是否为代码块，如果是则返回代码片段(list[str])
def checkcode(text):
    pass

#给存在代码块的地方添加按钮和索引，用户点击后创建编辑窗口并把对应的识别好的代码显示到编辑器中。
#创建按钮和触发器。
def add_button():
    pass

def image_to_text(image):
    # 预处理图像（提高OCR精度）
    img = image
    img = img.convert('L')  # 灰度化
    img = img.point(lambda x: 0 if x < 128 else 255)  # 二值化
    
    # 执行OCR
    text = pytesseract.image_to_string(img, lang='eng+equ')
    return text.strip()

#检查pdf文件，扫描代码块和图片
def parse_pdf(pdf_path,file_name):
    json_code_block = []
    count = 0
    file_path = os.path.join(pdf_path, file_name)
    with pdfplumber.open(file_path) as pdf:
        for page_id, page in enumerate(pdf.pages):
            text = page.extract_text()
            iscode, text_code, lang = checkcode(text)
            if (iscode==True):
                out_file = pdf_path + '_' + str(count) + '.' + lang
                with open(out_file,"w") as f:
                    for line in text_code:
                        f.write(line)
                json_code_block.append({"type": "code",
                    "page": page_id+1,
                    "position": text.find(text_code),
                    "path": file_path,
                    "language": lang})
                count += 1
                add_button()
            images = convert_from_path(file_path,first_page=page_id+1,last_page=page_id+1)
            for image in images:
                text_code = image_to_text(image)
                iscode, text_code, lang = checkcode(text_code)
                if (iscode==True):
                    out_file = pdf_path + '_' + str(count) + '.' + lang
                    with open(out_file,"w") as f:
                        for line in text_code:
                            f.write(line)
                    json_code_block.append({
                        "type": "image",
                        "page": page_id+1,
                        "position": 0,  # PDF坐标系统需要更复杂的处理
                        "path": out_file
                    })
                    count += 1
