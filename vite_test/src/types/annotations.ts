export type CommentData =
  |{
    id: string;
    page: number;
    type: "text";
    content: string;
    position: {
      x: number;
      y: number;
    };
    author: string;
    time: string;
  }
  |{
    id: string;
    page: number;
    type: "highlight";
    content: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    author: string;
    time: string;
  }
  |{
    id: string;
    page: number;
    type: "underline";
    content: string;
    position: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    author: string;
    time: string;
  };

export interface CodeSnippetData {
    id: string;
    page: number;
    content: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    language: string;
}

export interface RawCommentInput {
  filePath: string;
  page?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  height?: number;
  width?: number;
  type?: 'text' | 'highlight' | 'underline';
  content?: string;
  extra?: Record<string, unknown>;
  author?: string;
}