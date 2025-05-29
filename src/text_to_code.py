import re
from pygments.lexers import guess_lexer, get_lexer_by_name
from pygments.util import ClassNotFound

def extract_code_blocks_improved(text, lang=None):
    """
    准确提取文本中的代码块，确保一个程序对应一个完整代码块
    
    Args:
        text: 输入文本
        lang: 编程语言（可选），用于更准确的代码块识别
        
    Returns:
        提取出的代码块列表
    """
    # 分割文本行
    lines = text.split('\n')
    blocks = []
    current_block = []
    in_code_block = False
    include_buffer = []  # 用于临时存储include语句
    
    # 主函数和类定义的正则模式
    main_patterns = {
        'C': [r'^\s*(int|void)\s+main\s*\('],
        'C++': [r'^\s*(int|void)\s+main\s*\('],
        'Java': [r'^\s*public\s+(static\s+)?void\s+main\s*\('],
        'Python': [r'^\s*if\s+__name__\s*==\s*[\'"]__main__[\'"]\s*:', r'^\s*def\s+main\s*\(']
    }
    
    # 函数和类定义的通用模式
    function_patterns = {
        'C': [
            r'^\s*(int|void|char|float|double|long)\s+\w+\s*\(.*\)\s*\{?',
            r'^\s*(struct|enum)\s+\w+(\s+\{)?'
        ],
        'C++': [
            r'^\s*(int|void|char|float|double|long|auto)\s+\w+\s*\(.*\)\s*\{?',
            r'^\s*(class|struct|enum)\s+\w+(\s+\{)?',
            r'^\s*template\s*<.*>\s*(class|struct)\s+\w+'
        ],
        'Java': [
            r'^\s*(public|private|protected)(\s+static)?\s+\w+\s+\w+\s*\(.*\)\s*\{?',
            r'^\s*(public|private|protected)\s+(class|interface|enum)\s+\w+'
        ],
        'Python': [
            r'^\s*def\s+\w+\s*\(.*\)\s*:',
            r'^\s*class\s+\w+(\s*\(.*\))?\s*:',
            r'^\s*@\w+(\s*\(.*\))?\s*$'
        ]
    }
    
    # 预处理器和导入声明模式
    import_patterns = {
        'C': [r'^\s*#include\s*[<"].*[>"]'],
        'C++': [r'^\s*#include\s*[<"].*[>"]', r'^\s*using\s+namespace\s+\w+\s*;'],
        'Java': [r'^\s*import\s+[\w.]+\s*;', r'^\s*package\s+[\w.]+\s*;'],
        'Python': [r'^\s*import\s+\w+', r'^\s*from\s+[\w.]+\s+import']
    }
    
    # 根据语言选择适当的模式
    if lang:
        active_main_patterns = main_patterns.get(lang, [])
        active_function_patterns = function_patterns.get(lang, [])
        active_import_patterns = import_patterns.get(lang, [])
    else:
        active_main_patterns = [p for patterns in main_patterns.values() for p in patterns]
        active_function_patterns = [p for patterns in function_patterns.values() for p in patterns]
        active_import_patterns = [p for patterns in import_patterns.values() for p in patterns]
    
    brace_count = 0  # 用于跟踪花括号匹配
    indent_level = 0  # 用于Python的缩进级别
    
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        
        # 检查是否为导入/包含语句
        is_import = any(re.search(pattern, line) for pattern in active_import_patterns)
        
        # 检查是否为代码块的起始点
        is_start = False
        
        # 检查是否为主函数或函数定义开始
        for pattern in active_main_patterns + active_function_patterns:
            if re.search(pattern, line):
                is_start = True
                if current_block:
                    # 如果已有代码块，先保存它
                    code = '\n'.join(current_block).strip()
                    if is_valid_code(code):
                        blocks.append(code)
                current_block = []
                # 如果有缓存的include语句，添加到新代码块开始
                if include_buffer:
                    current_block.extend(include_buffer)
                    include_buffer = []
                in_code_block = True
                if lang == 'Python':
                    indent_level = len(re.match(r'^\s*', line).group())
                break
        
        # 处理导入/包含语句
        if is_import:
            if in_code_block:
                # 如果已经在代码块中，直接添加到当前块
                current_block.append(line)
            else:
                # 否则，添加到缓冲区
                include_buffer.append(line)
        # 处理其他代码行
        elif in_code_block or is_start:
            if not (line.strip().startswith('//') or 
                   line.strip().startswith('==') or 
                   line.strip().startswith(':') or
                   'DESKTOP' in line):
                current_block.append(line)
        
        # 更新花括号计数
        if lang in ['C', 'C++', 'Java']:
            brace_count += line.count('{') - line.count('}')
        
        # 检查代码块是否结束
        if in_code_block:
            if lang in ['C', 'C++', 'Java']:
                if brace_count == 0 and line.strip() == '}':
                    code = '\n'.join(current_block).strip()
                    if is_valid_code(code):
                        blocks.append(code)
                    current_block = []
                    in_code_block = False
                    include_buffer = []  # 清空include缓冲区
            elif lang == 'Python':
                if line.strip() and len(re.match(r'^\s*', line).group()) <= indent_level:
                    if current_block:
                        code = '\n'.join(current_block).strip()
                        if is_valid_code(code):
                            blocks.append(code)
                        current_block = []
                        in_code_block = False
                        include_buffer = []  # 清空include缓冲区
                        indent_level = 0
        
        # 处理多个空行作为代码块分隔
        if in_code_block and not line.strip() and i+1 < len(lines) and not lines[i+1].strip():
            if current_block:
                code = '\n'.join(current_block).strip()
                if is_valid_code(code):
                    blocks.append(code)
                current_block = []
                in_code_block = False
                include_buffer = []  # 清空include缓冲区
                brace_count = 0
                indent_level = 0
        
        i += 1
    
    # 处理最后一个代码块
    if current_block:
        code = '\n'.join(current_block).strip()
        if is_valid_code(code):
            blocks.append(code)
    
    return blocks, postprocess_code_blocks(blocks,lang)

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
    LANGUAGE_FEATURES["C"].extend([
        (r"#define\s+\w+", 3),                        # 宏定义
        (r"typedef\s+struct", 4),                     # 结构体类型定义
        (r"malloc\s*\(|free\s*\(", 3),                # 内存分配函数
        (r"FILE\s*\*", 3),                            # 文件操作
    ])
    
    LANGUAGE_FEATURES["C++"].extend([
        (r"new\s+\w+|delete\s+\w+", 4),               # 内存管理
        (r"template\s*<", 5),                         # 模板
        (r"namespace\s+\w+", 4),                      # 命名空间
        (r"\w+<\w+>", 3),                             # 模板实例化
    ])
    
    LANGUAGE_FEATURES["Python"].extend([
        (r":\s*\n\s+", 5),                            # 代码块缩进
        (r"with\s+\w+", 4),                           # with语句
        (r"for\s+\w+\s+in\s+", 4),                    # for循环
        (r"#.*?coding[:=]\s*([-\w.]+)", 3),           # 编码声明
    ])
    
    LANGUAGE_FEATURES["Java"].extend([
        (r"public\s+static\s+void\s+main", 5),        # main方法
        (r"@\w+", 3),                                 # 注解
        (r"new\s+\w+\s*\(", 3),                       # 对象创建
        (r"try\s*{[\s\S]*?}\s*catch", 4),             # 异常处理
    ])
    
    scores = {lang: 0 for lang in LANGUAGE_FEATURES}
    lines = text.split('\n')

    for lang, patterns in LANGUAGE_FEATURES.items():
        for line in lines:
            for pattern, weight in patterns:
                if re.search(pattern, line):
                    scores[lang] += weight

    max_score = max(scores.values())
    if max_score <= 5:
        return False, None, None, "Unknown"
    else:
        lang = max(scores, key=scores.get)
        origin_blocks, blocks = extract_code_blocks_improved(text, lang)
        return True, origin_blocks, blocks, lang

def is_valid_code(code):
    """判断提取的内容是否为有效的代码块"""
    if not code.strip():
        return False
        
    # 常见代码特征
    code_markers = [
        r'int\s+main', r'void\s+main', r'public\s+static\s+void\s+main',
        r'def\s+\w+\s*\(', r'class\s+\w+', r'#include', r'import\s+',
        r'return\s+', r'if\s*\(', r'for\s*\(', r'while\s*\('
    ]
    
    for marker in code_markers:
        if re.search(marker, code):
            return True
            
    # 使用pygments尝试检测语言
    try:
        lexer = guess_lexer(code)
        lang = lexer.name.lower()
        return lang in ['c', 'c++', 'java', 'python']
    except ClassNotFound:
        pass
        
    # 长度检查 - 太短的可能不是有效代码
    return len(code.strip().split('\n')) >= 3

def postprocess_code_blocks(blocks, lang):
    """
    后处理代码块，进行代码修正和补全
    
    Args:
        blocks: 提取出的代码块列表
        
    Returns:
        处理后的代码块列表
    """
    result = []
    
    for block in blocks:
        try:
            # 尝试检测代码语言
            lexer = guess_lexer(block)
            if (lang == None) or (lang == "Unknown"):
                lang = lexer.name.lower()
            
            # 根据不同语言进行处理
            if 'c' in lang:
                fixed_block = fix_c_code(block)
            elif 'c++' in lang:
                fixed_block = fix_cpp_code(block)
            elif 'java' in lang:
                fixed_block = fix_java_code(block)
            elif 'python' in lang:
                fixed_block = fix_python_code(block)
            else:
                fixed_block = block
                
            result.append(fixed_block)
        except ClassNotFound:
            # 如果无法检测语言，保持原样
            result.append(block)
    
    return result

def format_code(code, lang):
    """
    格式化代码，修复空格缺失和格式对齐问题
    
    Args:
        code: 要格式化的代码
        lang: 编程语言
    
    Returns:
        格式化后的代码
    """
    # 首先保护字符串字面量
    protected_strings = []
    def protect_strings(match):
        protected_strings.append(match.group(0))
        return f"__STRING_{len(protected_strings)-1}__"
    
    # 保护字符串字面量，包括多行字符串
    string_pattern = r'("(?:[^"\\]|\\.)*")'
    protected_code = re.sub(string_pattern, protect_strings, code)
    
    lines = protected_code.split('\n')
    result = []
    indent_level = 0
    
    # 常见的需要空格的操作符和关键字
    operators = ['=', '+', '-', '*', '/', '%', '==', '!=', '>=', '<=', '>', '<', '&&', '||']
    keywords = {
        'C': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'void', 'int', 'char', 'float', 'double', 'long'],
        'C++': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'class', 'template', 'void', 'int', 'char', 'float', 'double', 'long'],
        'Java': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'class', 'interface', 'void', 'int', 'char', 'float', 'double', 'long'],
        'Python': ['if', 'else', 'elif', 'for', 'while', 'def', 'class', 'return', 'import', 'from']
    }
    
    # 获取当前语言的关键字
    current_keywords = keywords.get(lang, keywords['C'])
    
    # 合并分散的字符串字面量
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # 如果这一行以字符串开始但没有结束，尝试与下一行合并
        if line.count('"') % 2 == 1 and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if next_line.count('"') % 2 == 1:
                lines[i] = line + next_line
                del lines[i + 1]
                continue
        i += 1
    
    for i, line in enumerate(lines):
        # 移除行首尾空格
        line = line.strip()
        
        if not line:
            result.append('')
            continue
            
        # 处理缩进
        if lang in ['C', 'C++', 'Java']:
            # 减少缩进的情况
            if '}' in line:
                indent_level = max(0, indent_level - 1)
            # 添加缩进
            if indent_level > 0:
                line = '    ' * indent_level + line
            # 增加缩进的情况
            if '{' in line:
                indent_level += 1
        
        # 修复空格问题
        # 1. 修复关键字后直接跟标识符或数字的情况
        for keyword in current_keywords:
            pattern = fr'\b{keyword}(\w+)'
            if re.search(pattern, line):
                line = re.sub(pattern, fr'{keyword} \1', line)
        
        # 2. 在操作符前后添加空格
        for op in operators:
            if op in line:
                # 避免修改 -> 运算符
                if op == '-' and '->' in line:
                    continue
                # 避免修改 #include 中的 <
                if op in ['<', '>'] and '#include' in line:
                    continue
                # 添加空格，但避免重复空格
                line = line.replace(op, f' {op} ').replace('  ', ' ')
        
        # 3. 修复函数调用和定义的空格
        if '(' in line and not line.strip().startswith('#'):
            # 修复函数名和括号之间的空格
            line = re.sub(r'(\w+)\s+\(', r'\1(', line)
            # 修复参数之间的逗号后的空格
            line = re.sub(r',\s*', r', ', line)
            # 修复指针声明的空格
            line = re.sub(r'\*\s*(\w+)', r'* \1', line)
        
        result.append(line)
    
    formatted = '\n'.join(result)
    
    # 恢复被保护的字符串
    for i, string in enumerate(protected_strings):
        formatted = formatted.replace(f"__STRING_{i}__", string)
    
    # 最后的清理：删除多余的空格
    formatted = re.sub(r' +', ' ', formatted)
    formatted = re.sub(r' +$', '', formatted, flags=re.MULTILINE)
    
    return formatted

def fix_c_code(code):
    """修复和补全C代码"""
    lines = code.split('\n')
    result = []
    includes = set()
    has_main = False
    brace_count = 0
    
    # 检查必要的头文件
    standard_headers = {
        'printf': 'stdio.h',
        'malloc': 'stdlib.h',
        'strlen': 'string.h',
        'memcpy': 'string.h',
        'sqrt': 'math.h'
    }
    
    # 分析代码中使用的函数
    for line in code.split('\n'):
        for func, header in standard_headers.items():
            if func in line and header not in includes:
                includes.add(header)
        if 'main' in line:
            has_main = True
    
    # 添加必要的头文件
    for header in sorted(includes):
        result.append(f'#include <{header}>')
    if result:
        result.append('')  # 添加空行
    
    # 处理每一行代码
    for line in lines:
        # 跳过已经存在的头文件包含
        if line.strip().startswith('#include'):
            if not any(header in line for header in includes):
                result.append(line)
            continue
            
        # 修复缺失的分号
        if (line.strip() and 
            not line.strip().endswith(';') and 
            not line.strip().endswith('{') and 
            not line.strip().endswith('}') and 
            not line.strip().startswith('#') and
            not any(kw in line.strip() for kw in ['if', 'else', 'for', 'while', 'do'])):
            line = line.rstrip() + ';'
            
        result.append(line)
        
        # 跟踪花括号
        brace_count += line.count('{') - line.count('}')
    
    # 补全缺失的右花括号
    while brace_count > 0:
        result.append('}')
        brace_count -= 1
    
    # 如果没有main函数但有其他函数定义，添加main函数
    if not has_main and any('(' in line for line in lines):
        if result:
            result.append('')  # 添加空行
        result.extend([
            'int main() {',
            '    // TODO: Add main function implementation',
            '    return 0;',
            '}'
        ])
    
    # 在返回之前添加格式化
    result = '\n'.join(result)
    return format_code(result, 'C')

def fix_cpp_code(code):
    """修复和补全C++代码"""
    lines = code.split('\n')
    result = []
    includes = set()
    has_namespace = False
    has_main = False
    brace_count = 0
    
    # 检查必要的头文件
    standard_headers = {
        'cout': 'iostream',
        'vector': 'vector',
        'string': 'string',
        'map': 'map',
        'set': 'set'
    }
    
    # 分析代码中使用的特性
    for line in code.split('\n'):
        for feature, header in standard_headers.items():
            if feature in line and header not in includes:
                includes.add(header)
        if 'namespace' in line:
            has_namespace = True
        if 'main' in line:
            has_main = True
    
    # 添加必要的头文件
    for header in sorted(includes):
        result.append(f'#include <{header}>')
    
    # 添加命名空间声明
    if not has_namespace and any('std::' not in line and ('cout' in line or 'cin' in line or 'string' in line) 
                               for line in lines):
        if result:
            result.append('')
        result.append('using namespace std;')
    
    if result:
        result.append('')  # 添加空行
    
    # 处理每一行代码
    for line in lines:
        # 跳过已经存在的头文件包含
        if line.strip().startswith('#include'):
            if not any(header in line for header in includes):
                result.append(line)
            continue
            
        # 修复缺失的分号
        if (line.strip() and 
            not line.strip().endswith(';') and 
            not line.strip().endswith('{') and 
            not line.strip().endswith('}') and 
            not line.strip().startswith('#') and
            not any(kw in line.strip() for kw in ['if', 'else', 'for', 'while', 'do', 'class', 'struct', 'namespace'])):
            line = line.rstrip() + ';'
            
        result.append(line)
        
        # 跟踪花括号
        brace_count += line.count('{') - line.count('}')
    
    # 补全缺失的右花括号
    while brace_count > 0:
        result.append('}')
        brace_count -= 1
    
    # 如果没有main函数但有其他函数定义，添加main函数
    if not has_main and any('(' in line for line in lines):
        if result:
            result.append('')
        result.extend([
            'int main() {',
            '    // TODO: Add main function implementation',
            '    return 0;',
            '}'
        ])
    
    # 在返回之前添加格式化
    result = '\n'.join(result)
    return format_code(result, 'C++')

def fix_java_code(code):
    """修复和补全Java代码"""
    lines = code.split('\n')
    result = []
    imports = set()
    has_class = False
    has_main = False
    brace_count = 0
    class_name = "Main"  # 默认类名
    
    # 检查必要的导入
    standard_imports = {
        'Scanner': 'java.util.Scanner',
        'List': 'java.util.List',
        'ArrayList': 'java.util.ArrayList',
        'Map': 'java.util.Map',
        'HashMap': 'java.util.HashMap'
    }
    
    # 分析代码中使用的类
    for line in code.split('\n'):
        for class_name, import_path in standard_imports.items():
            if class_name in line and import_path not in imports:
                imports.add(import_path)
        if 'class' in line:
            has_class = True
            # 提取类名
            match = re.search(r'class\s+(\w+)', line)
            if match:
                class_name = match.group(1)
        if 'main' in line:
            has_main = True
    
    # 添加必要的导入
    for import_path in sorted(imports):
        result.append(f'import {import_path};')
    if result:
        result.append('')
    
    # 如果没有类定义，添加类
    if not has_class:
        result.append(f'public class {class_name} {{')
        brace_count += 1
    
    # 处理每一行代码
    for line in lines:
        # 跳过已经存在的导入语句
        if line.strip().startswith('import'):
            if not any(imp in line for imp in imports):
                result.append(line)
            continue
            
        # 修复缺失的分号
        if (line.strip() and 
            not line.strip().endswith(';') and 
            not line.strip().endswith('{') and 
            not line.strip().endswith('}') and
            not line.strip().startswith('@') and
            not any(kw in line.strip() for kw in ['class', 'interface', 'enum', 'if', 'else', 'for', 'while', 'do'])):
            line = line.rstrip() + ';'
            
        result.append(line)
        
        # 跟踪花括号
        brace_count += line.count('{') - line.count('}')
    
    # 如果没有main方法但有类定义，添加main方法
    if not has_main and has_class:
        if result:
            result.append('')
        result.extend([
            '    public static void main(String[] args) {',
            '        // TODO: Add main method implementation',
            '    }'
        ])
    
    # 补全缺失的右花括号
    while brace_count > 0:
        result.append('}')
        brace_count -= 1
    
    # 在返回之前添加格式化
    result = '\n'.join(result)
    return format_code(result, 'Java')

def fix_python_code(code):
    """修复和补全Python代码"""
    lines = code.split('\n')
    result = []
    imports = set()
    has_main = False
    current_indent = 0
    
    # 检查必要的导入
    standard_imports = {
        'random': ['randint', 'choice', 'random'],
        'math': ['sqrt', 'pi', 'sin', 'cos'],
        'sys': ['argv', 'exit'],
        'os': ['path', 'makedirs', 'remove'],
        're': ['match', 'search', 'findall']
    }
    
    # 分析代码中使用的模块
    for line in code.split('\n'):
        for module, features in standard_imports.items():
            if any(feature in line for feature in features) and module not in imports:
                imports.add(module)
        if '__main__' in line:
            has_main = True
    
    # 添加必要的导入
    for module in sorted(imports):
        result.append(f'import {module}')
    if result:
        result.append('')
    
    # 处理每一行代码
    for line in lines:
        # 跳过已经存在的导入语句
        if line.strip().startswith('import') or line.strip().startswith('from'):
            if not any(module in line for module in imports):
                result.append(line)
            continue
        
        # 修复缩进
        stripped = line.lstrip()
        if stripped:
            indent = len(line) - len(stripped)
            if indent % 4 != 0:
                # 修正为4的倍数
                new_indent = (indent // 4) * 4
                line = ' ' * new_indent + stripped
        
        result.append(line)
    
    # 如果有函数定义但没有main块，添加main块
    if not has_main and any('def ' in line for line in lines):
        if result:
            result.append('')
        result.extend([
            "if __name__ == '__main__':",
            '    # TODO: Add main block implementation',
            '    pass'
        ])
    
    # 在返回之前添加格式化
    result = '\n'.join(result)
    return format_code(result, 'Python')

if __name__ == '__main__':
    import sys
    code = sys.stdin.read()
    iscode, origin_blocks, blocks, lang = checkcode(code)
    print(lang)