import os
import sys
from PIL import Image
from pdf2image import convert_from_path
import pytesseract
from text_to_code import checkcode
import fitz

def add_button():
    pass

def image_to_text(image):
    img = image.convert('L')  # 灰度化
    img = img.point(lambda x: 0 if x < 128 else 255)  # 二值化
    text = pytesseract.image_to_string(img, lang='eng+equ')
    return text.strip()

def parse_pdf(pdf_path, file_name, output_dir):
    Language_to_suffix = {'C': '.c', 'C++': '.cpp', 'Java': '.java', 'Python': '.py'}
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
            suffix = Language_to_suffix.get(lang, ".txt")
            out_file = os.path.join(output_dir, f"{file_name}_Page_{page_id}{suffix}")
            with open(out_file, "w") as f:
                for line in text_code:
                    f.write(line + "\n")
            add_button()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法错误：请提供PDF文件路径，及可选的输出目录。\n示例：python pdf_test.py ./Lab05.pdf ./output/")
        sys.exit(1)

    full_path = sys.argv[1]
    pdf_path, file_name = os.path.split(full_path)
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."

    parse_pdf(pdf_path, file_name, output_dir)
