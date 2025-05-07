export interface CommentData {
    id: string;
    page: number;
    type: "text" | "highlight" | "underline" | "image";
    content: string;
    position: {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
    author: string;
    time: string;
  }
  
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
}
  