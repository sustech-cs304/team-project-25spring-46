import re

# 检查文本是否为代码
# 利用关键符号/特殊符号进行匹配，进一步识别编程语言。
# 返回是否为代码块，如果是则返回代码片段(list[str])
def extract_code_blocks(text, lang):
    Expression = {
        'Common': [
            r'if\s*\(.*?\)\s*\{.*?\}(?=\s*(?:else|\w|#))',  # if/else
            r'for\s*\([^)]*\)\s*\{.*?\}(?=\s*\w)',  # for
            r'while\s*\([^)]*\)\s*\{.*?\}(?=\s*\w)'  # while
        ],
        'Preprocess': [
            r'#include.*?(?=^\s*(?:int|void|float|double|char|class)\s+\w+\s*\(|\Z)'  #include
            # r'^\s*#(?:include|define|ifdef)\s+[<"][^>"]+[>"]',  # include头文件
            # r'using\s+namespace\s+\w+\s*;',  # using namespace
        ],
        'C': [
            r'(?m)\*\w+\s*=\s*\w+;|&\w+\s*=\s*\w+;',  # 指针
            r'\b(?:int|void|char|float|double)\s+\w+\s*\([^)]*\)\s*\{.*?\}(?=\s*(?:\w|#|\Z))',  # 带返回值的函数
            r'void\s+\w+\s*\(.*?\)\s*\{[\s\S]+?\}(?=\n\w)',  # void类函数
            r'int\s+main\s*\([^)]*\)\s*\{.*?\}(?=\s*(?:\w|#|\Z))'  # main函数
        ],
        'C++': [

            r'(?m)\*\w+\s*=\s*\w+;|&\w+\s*=\s*\w+;',  # 指针
            r'\b(?:[\w\s]+\b)+?\s+\w+\s*\(.*?\)\s*\{[\s\S]+?\}(?=\n\w)',  # 带返回值的函数
            r'void\s+\w+\s*\(.*?\)\s*\{[\s\S]+?\}(?=\n\w)',  # void类函数
            r'class\s+\w+\s*\{[\s\S]+?\}(?=\n\w|;\s*$)',  # class定义
            r'(?m)\*\w+\s*=\s*\w+;|&\w+\s*=\s*\w+;',  # 指针操作
            r'int\s+main\s*\([^)]*\)\s*\{[\s\S]+?\}(?=\s*(?:\w|#|\Z))'  # main函数
        ],
        'Java': [
            r'(public\s+)?class\s+\w+\s*\{[\s\S]+?\}',  # 类定义
            r'public\s+(?:static\s+)?[\w<>]+\s+\w+\s*\([^)]*\)\s*\{[\s\S]+?\}',  # 方法定义
            r'@\w+(?:\([^)]*\))?'  # 重载等
        ],
        'Python': [
            r'def\s+\w+\s*\([^)]*\)\s*:[\s\S]+?(?=\n\s*(?:def|class)|\Z)',  # 函数定义
            r'class\s+\w+[\s\S]+?(?=\n\s*(?:def|class)|\Z)',  # class定义
            r'\[\s*\w+\s+for\s+\w+\s+in\s+\w+(?:\s+if\s+\w+)?\s*\]',  # 列表推导式
            r'@\w+\s*[\s\S]+?def\s+\w+'  # 装饰器
        ]
    }
    code_block = []
    for express in Expression['Common']:
        code_block.extend(re.findall(express, text, re.DOTALL))
    for express in Expression['Preprocess']:
        code_block.extend(re.findall(express, text, re.DOTALL | re.MULTILINE))
    for express in Expression[lang]:
        code_block.extend(re.findall(express, text, re.DOTALL))
    print(code_block)
    return code_block


def checkcode(text):
    """
    :param text:
    :return:
    通过语言特性识别编程语言（C,C++,Python,Java）
    """
    LANGUAGE_FEATURES = {
        "C": [
            (r"#include\s+<[a-z]+\.h>", 5),  # 头文件包含
            (r"int\s+main\s*\(.*?\)\s*{", 4),  # main函数定义
            (r"printf\s*\(", 3),  # 标准输出函数
            (r"->|struct\s+\w+", 2),  # 指针和结构体
            (r'`\b(?:[\w\s]+\b)+?\s+\w+\s*[)]∗[)]∗\s*{[\s\S]+?}(?=\n\w)', 4),  # 带返回值的函数
            (r'`void\s+\w+\s*[)]∗[)]∗\s*{[\s\S]+?}(?=\n\w)', 4),  # void类函数
        ],
        "C++": [
            (r"#include\s+<[a-z]+>", 4),  # 标准库头文件
            (r"using\s+namespace\s+std;", 5),  # 命名空间声明
            (r"std::\w+", 3),  # STL组件
            (r"class\s+\w+\s*{", 4),  # 类声明
            (r"cout\s*<<", 3),  # 输出流
            (r'`\b(?:[\w\s]+\b)+?\s+\w+\s*[)]∗[)]∗\s*{[\s\S]+?}(?=\n\w)', 4),  # 带返回值的函数
            (r'`void\s+\w+\s*[)]∗[)]∗\s*{[\s\S]+?}(?=\n\w)', 4),  # void类函数
        ],
        "Java": [
            (r"public\s+class\s+\w+", 5),  # 类声明
            (r"System\.out\.print", 4),  # 标准输出
            (r"import\s+java\.", 4),  # 包导入
            (r"@Override|@Test", 3)  # 注解
        ],
        "Python": [
            (r"def\s+\w+\s*\(", 5),  # 函数定义
            (r"import\s+(os|sys|numpy)", 3),  # 常见模块
            (r"print\(.*?\)", 3),  # 输出语句
            (r"lambda\s+.*?:", 2),  # 匿名函数
            (r"^[\t ]+", 4)  # 缩进语法（需逐行检查）
        ]
    }
    scores = {lang: 0 for lang in LANGUAGE_FEATURES}
    lines = text.split('\n')

    for lang, patterns in LANGUAGE_FEATURES.items():
        for line in lines:
            for pattern, weight in patterns:
                if re.search(pattern, line):
                    scores[lang] += weight

    max_score = max(scores.values())
    if max_score <= 5:
        return False, None, "Unknown"
    else:
        lang = max(scores, key=scores.get)
        blocks = extract_code_blocks(text, lang)
        return True, blocks, lang