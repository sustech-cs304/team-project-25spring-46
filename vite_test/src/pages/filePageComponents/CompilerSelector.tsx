import { useEffect } from 'react';
import { getVsCodeApi } from '../../vscodeApi';

export interface CompilerSelectorProps {
    language: string;
    onCompilerChange: (compiler: string) => void;
    availableCompilers: string[];
}

export function CompilerSelector({ language, onCompilerChange, availableCompilers }: CompilerSelectorProps) {
    const vscode = getVsCodeApi();

    // 初始化时检查编译器可用性
    useEffect(() => {
        vscode.postMessage({
            command: 'getAvailableCompilers',
            language
        });
    }, [language]);

    return (
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                    编程语言：
                    <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {language || 'Unknown'}
                    </span>
                </span>
            </div>
            
            <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">编译器/解释器：</label>
                {availableCompilers.length > 0 ? (
                    <select
                        className="border rounded px-2 py-1 text-sm bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        onChange={(e) => onCompilerChange(e.target.value)}
                        defaultValue={availableCompilers[0]}
                    >
                        {availableCompilers.map((compiler) => (
                            <option key={compiler} value={compiler}>
                                {compiler}
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="text-sm text-red-600">
                        ⚠️ 未检测到 {language} 的编译器/解释器
                    </div>
                )}
            </div>
        </div>
    );
}