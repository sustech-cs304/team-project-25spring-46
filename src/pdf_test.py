'''
Author: hatfail 1833943280@qq.com
Date: 2025-03-30 23:27:35
LastEditors: hatfail 1833943280@qq.com
LastEditTime: 2025-04-06 19:37:05
FilePath: pdf_test.py
Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
'''
import os
from PIL import Image
import re
from pdf2image import convert_from_path
import pytesseract
from text_to_code import checkcode
import fitz



    # return max(scores, key=scores.get) if max_score > 5 else "Unknown"


# 给存在代码块的地方添加按钮和索引，用户点击后创建编辑窗口并把对应的识别好的代码显示到编辑器中。
# 创建按钮和触发器。
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

# 检查pdf文件，扫描代码块和图片
def parse_pdf(pdf_path, file_name):
    """
    :param pdf_path: 文件路径
    :param file_name: 文件名
    :return:
    todo:添加图片识别
    """
    Language_to_suffix = {'C': '.c', 'C++': '.cpp', 'Java': '.java', 'Python': '.py'}
    json_code_block = []
    count = 0
    page_id = 0
    file_path = os.path.join(pdf_path, file_name)
    doc = fitz.open(file_path)
    columns = []
    for page in doc:
        text = page.get_text()
        page_id += 1
        # print(f"page {page_id}:")
        # print(len(text))
        # print(text)
        iscode, text_code, lang = checkcode(text)
        # print(f"text is code: {iscode}, block is {text_code}, language is {lang}")
        if iscode:
            count += 1
            out_file = file_path + '_' + "Page_" + str(page_id) + Language_to_suffix[lang]
            with open(out_file, "w") as f:
                for line in text_code:
                    f.write(line+"\n")
            # json_code_block.append({"type": "code",
            #     "page": count,
            #     "position": text.find(text_code),
            #     "path": file_path,
            #     "language": lang})
            add_button()
        # print("Images")
        # images = convert_from_path(file_path,first_page=page_id+1,last_page=page_id+1)
        # for image in images:
        #     text_code = image_to_text(image)
        #     print(text_code)
        #     iscode, text_code, lang = checkcode(text_code)
        #     if (iscode==True):
        #         out_file = pdf_path + '_' + str(page_id) + '_img' + Language_to_suffix[lang]
        #         with open(out_file,"w") as f:
        #             for line in text_code:
        #                 f.write(line)
        #         json_code_block.append({
        #             "type": "image",
        #             "page": page_id+1,
        #             "position": 0,
        #             "path": out_file
        #         })
        #         count += 1


if __name__ == '__main__':
    file_path = "Lab05.pdf"
    parse_pdf("", file_path)
