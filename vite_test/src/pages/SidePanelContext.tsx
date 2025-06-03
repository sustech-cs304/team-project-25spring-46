// SidePanelContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// 定义标注详情的数据类型（评论和代码）
// type PanelType = 'comment' | 'code';

interface CommentDetail {
  id: string;
  type: 'comment';
  content: string;
  author: string;
  time: string;
}

interface CodeDetail {
  id: string;
  type: 'code';
  code: string;
  language?: string;
}

type PanelDetail = CommentDetail | CodeDetail;

interface SidePanelContextValue {
  openPanels: PanelDetail[];                      // 当前打开的详情面板数据
  openPanel: (detail: PanelDetail) => void;       // 打开新的详情面板
  closePanel: (id: string) => void;               // 关闭指定ID的详情面板
}

// 创建 Context
const SidePanelContext = createContext<SidePanelContextValue | undefined>(undefined);

// 定义 Provider 组件
export const SidePanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [openPanels, setOpenPanels] = useState<PanelDetail[]>([]);

  // 打开面板函数：添加新的详情(避免重复打开相同ID)
  const openPanel = (detail: PanelDetail) => {
    setOpenPanels(prev => {
      // 若该标注已打开，则不重复添加
      if (prev.find(p => p.id === detail.id)) {
        return prev;
      }
      return [...prev, detail];
    });
  };

  // 关闭面板函数：按ID移除
  const closePanel = (id: string) => {
    console.log('closePanel', id);
    setOpenPanels(prev => prev.filter(p => p.id !== id));
  };

  // 上下文值
  const value: SidePanelContextValue = { openPanels, openPanel, closePanel };

  return (
    <SidePanelContext.Provider value={value}>
      {children}
    </SidePanelContext.Provider>
  );
};

// 自定义 Hook 方便使用 Context
export const useSidePanel = (): SidePanelContextValue => {
  const context = useContext(SidePanelContext);
  if (!context) {
    throw new Error('useSidePanel must be used within a SidePanelProvider');
  }
  return context;
};
