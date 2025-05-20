declare module 'pdfjs-dist' {
  export interface GlobalWorkerOptions {
    workerSrc: string;
  }

  export function getDocument(params: any): any;
}

declare module 'pdfjs-dist/types/src/display/api' {
  export interface TextItem {
    str: string;
    transform: number[];
    fontName: string;
  }
}