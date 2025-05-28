/**
 * Python 环境管理工具
 * 用于激活和使用指定的 Conda 环境
 */
import { execSync } from 'child_process';

export class CondaEnv {
    private condaPath: string;
    private envName: string;

    /**
     * 创建 Conda 环境管理器
     * @param condaPath Conda 可执行文件路径，默认为 'conda'
     * @param envName 环境名称，默认为 'dailywork'
     */
    constructor(condaPath: string = 'conda', envName: string = 'dailywork') {
        this.condaPath = condaPath;
        this.envName = envName;
    }

    /**
     * 获取环境名称
     */
    getEnvName(): string {
        return this.envName;
    }

    /**
     * 激活 Conda 环境并运行命令
     * @param command 要执行的命令
     * @returns 命令执行结果
     */
    private runInCondaEnv(command: string): string {
        try {
            // 构建激活环境并运行命令的完整指令
            const fullCommand = `${this.condaPath} run -n ${this.envName} ${command}`;
            return execSync(fullCommand, { encoding: 'utf-8' });
        } catch (error) {
            throw new Error(`在 Conda 环境 ${this.envName} 中运行命令失败: ${error}`);
        }
    }

    /**
     * 检查 Conda 环境中的 Python 版本
     */
    checkPythonVersion(): string {
        return this.runInCondaEnv('python --version');
    }

    /**
     * 安装依赖
     * @param requirementsFile requirements.txt 文件路径
     */
    installDependencies(requirementsFile: string): string {
        return this.runInCondaEnv(`python -m pip install -r ${requirementsFile}`);
    }

    /**
     * 运行 Python 脚本
     * @param scriptPath 脚本路径
     * @param args 脚本参数
     */
    runScript(scriptPath: string, args: string[] = []): string {
        const command = `python ${scriptPath} ${args.join(' ')}`;
        return this.runInCondaEnv(command);
    }

    /**
     * 执行 Python 代码字符串
     * @param code Python 代码字符串
     */
    runCode(code: string): string {
        return this.runInCondaEnv(`python -c "${code.replace(/"/g, '\\"')}"`);
    }
}

// 创建默认的 dailywork 环境实例
export const defaultEnv = new CondaEnv('conda', 'dailywork');

// 便捷函数，直接在 dailywork 环境中运行脚本
export function runPythonScript(scriptPath: string, args: string[] = []): string {
    return defaultEnv.runScript(scriptPath, args);
}

// 便捷函数，直接在 dailywork 环境中运行代码字符串
export function runPythonCode(code: string): string {
    return defaultEnv.runCode(code);
}