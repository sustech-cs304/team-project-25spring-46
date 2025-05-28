import os
from PIL import Image
import sys
import easyocr
from text_to_code import checkcode,postprocess_code_blocks
import fitz
from difflib import SequenceMatcher
import json

# 定义全局reader变量，避免反复初始化
reader = None

def image_to_text(image):
    global reader
    
    # 首次使用时初始化reader
    if reader is None:
        # 只需导入一次所需语言模型 ['en']=英语, ['en', 'ch_sim']=英语+简体中文
        reader = easyocr.Reader(['en'], gpu=False) 
        print("EasyOCR初始化完成")
    
    # 预处理图像（提高OCR精度）
    img = image
    img = img.convert('L')  # 灰度化
    
    # 使用EasyOCR进行文本识别
    try:
        # 将PIL图像转换为numpy数组
        import numpy as np
        img_array = np.array(img)
        
        # 执行OCR
        results = reader.readtext(img_array)
        
        # 提取所有识别的文本并拼接
        extracted_text = '\n'.join([text for _, text, _ in results])
        return extracted_text
    except Exception as e:
        print(f"OCR处理错误: {e}")
        return ""

def merge_rectangles(rectangles):
    if not rectangles:
        return None
    x0 = min(rect.x0 for rect in rectangles)
    y0 = min(rect.y0 for rect in rectangles)
    x1 = max(rect.x1 for rect in rectangles)
    y1 = max(rect.y1 for rect in rectangles)
    print(x0, y0, x1, y1)
    return fitz.Rect(x0, y0, x1, y1)

# 检查pdf文件，扫描代码块和图片
def parse_pdf(pdf_path, file_name, output_dir):
    """
    :param pdf_path: 文件路径
    :param file_name: 文件名
    :return: 提取PDF中的代码块和图像中的代码
    """
    Language_to_suffix = {'C': '.c', 'C++': '.cpp', 'Java': '.java', 'Python': '.py', 'Unknown': '.txt'}
    json_code_block = []
    count = 0
    page_id = 0
    file_path = os.path.join(pdf_path, file_name)
    doc = fitz.open(file_path)
    for page in doc:
        width, height = page.rect.width, page.rect.height
        text = page.get_text()
        page_id += 1
        
        # 处理页面文本中的代码
        iscode, origin_text_code, text_code, lang = checkcode(text)
        if iscode:
            count += 1
            num = 0
            for i in range(0,len(text_code)):
                line = text_code[i]
                origin_text = origin_text_code[i]
                out_file = output_dir + "/" + file_name + '_' + "Page_" + str(page_id) + "_" + str(num) + Language_to_suffix[lang]
                print(out_file)
                # 应用语法修正
                
                with open(out_file, "w", encoding="utf-8") as f:
                    f.write(line)
                num += 1
                
                # 使用原始代码进行位置查找（因为修正后的代码可能与PDF中的不完全匹配）
                rectan = page.search_for(origin_text)
                rect = merge_rectangles(rectan)
                json_code_block.append({
                    "type": "code",
                    "page": page_id,
                    "position": [rect.x0 / width, rect.y0 / height, (rect.x1 - rect.x0) / width, (rect.y1 - rect.y0) / height],
                    "path": out_file,
                    "language": lang,
                    "code": line  # 保存修正后的代码
                })
        
        # 图像代码处理部分
        img_num = 0
        # 1. 提取页面中的图像
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            
            # 提取图像数据
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            
            # 转换为PIL图像
            import io
            img_pil = Image.open(io.BytesIO(image_bytes))
            
            # OCR识别图像中的文本
            img_text = image_to_text(img_pil)
            
            # 检查提取的文本是否包含代码
            img_iscode, origin_img_code_blocks, img_code_blocks, img_lang = checkcode(img_text)
            
            if img_iscode and img_code_blocks:
                for block_idx, block in enumerate(img_code_blocks):
                    out_img_file = f"{output_dir}/{file_name}_Page_{page_id}_img_{img_num}{Language_to_suffix[img_lang]}"
                    print(out_img_file)
                    # 应用语法修正
                    
                    # 保存代码到文件
                    with open(out_img_file, "w", encoding="utf-8") as f:
                        f.write(block)
                    
                    # 获取图像在页面中的位置
                    img_rect = None
                    for item in page.get_text("dict")["blocks"]:
                        if item["type"] == 1 and "image" in item:  # 图像类型块
                            if item["image"] == xref:
                                img_rect = item["bbox"]
                                break
                    
                    # 如果找不到位置，使用合理的默认值
                    if not img_rect:
                        # 尝试另一种方法获取图像位置
                        try:
                            img_rect = page.get_image_rects(xref)[0]
                        except:
                            img_rect = fitz.Rect(0, 0, width, height)
                    
                    # 添加到JSON输出
                    json_code_block.append({
                        "type": "image_code",
                        "page": page_id,
                        "position": [
                            img_rect[0] / width, 
                            img_rect[1] / height,
                            (img_rect[2] - img_rect[0]) / width,
                            (img_rect[3] - img_rect[1]) / height
                        ],
                        "path": out_img_file,
                        "language": img_lang,
                        "code": block
                    })
                
                img_num += 1

    # 将代码块信息保存到JSON文件
    output_json_dir = output_dir + "\\" + os.path.splitext(file_name)[0] + "_code_block.json"
    with open(output_json_dir, "w", encoding="utf-8") as f:
        json.dump(json_code_block, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法错误：请提供PDF文件路径，及可选的输出目录。\n示例：python pdf_test.py ./Lab05.pdf ./output/")
        sys.exit(1)

    full_path = sys.argv[1]
    pdf_path, file_name = os.path.split(full_path)
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."

    parse_pdf(pdf_path, file_name, output_dir)