import sys
import os
from PIL import Image
import re
from pdf2image import convert_from_path
import pytesseract
from text_to_code import checkcode
import fitz
import json

def image_to_text(image):
    # 预处理图像（提高OCR精度）
    img = image
    img = img.convert('L')  # 灰度化
    img = img.point(lambda x: 0 if x < 128 else 255)  # 二值化

    # 执行OCR
    text = pytesseract.image_to_string(img, lang='eng+equ')
    return text.strip()

# 检查pdf文件，扫描代码块和图片
def parse_pdf(pdf_path, file_name, output_dir):
    """
    :param pdf_path: 文件路径
    :param file_name: 文件名
    :return:
    todo:添加图片识别
    """
    Language_to_suffix = {'C': '.c', 'C++': '.cpp', 'Java': '.java', 'Python': '.py', 'Unknown': '.txt'}
    json_code_block = []
    count = 0
    page_id = 0
    file_path = os.path.join(pdf_path, file_name)
    doc = fitz.open(file_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    for page in doc:
        text = page.get_text()
        page_id += 1
        iscode, text_code, lang = checkcode(text)
        if iscode:
            count += 1
            num = 0
            for line in text_code:
                out_file = output_dir + '_' + "Page_" + str(page_id) + "_" + str(num) + Language_to_suffix[lang]
                with open(out_file, "w") as f:
                    f.write(line['code'])
                num += 1
                rectan = page.search_for(line['code'])
                for rect in rectan:
                    json_code_block.append({"type": "code",
                        "page": page_id,
                        "position": [rect.x0, rect.y0, rect.x1, rect.y1],
                        "path": out_file,
                        "language": lang,
                        "code": line['code']}
                        )
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
    with open(output_dir + "code_block.json", "w") as f:
        json.dump(json_code_block, f, ensure_ascii=False, indent=4)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法错误：请提供PDF文件路径，及可选的输出目录。\n示例：python pdf_test.py ./Lab05.pdf ./output/")
        sys.exit(1)

    full_path = sys.argv[1]
    pdf_path, file_name = os.path.split(full_path)
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."

    parse_pdf(pdf_path, file_name, output_dir)
