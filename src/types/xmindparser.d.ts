// src/types/xmindparser.d.ts
declare module 'xmindparser' {
    interface XMindNode {
      title: string;
      children?: XMindNode[];
    }
  
    interface XMindSheet {
      rootTopic: XMindNode;
    }
  
    interface XMindParser {
      new (): XMindParser;
      parse(buffer: Buffer): Promise<XMindSheet[]>;
    }
  
    const xmindparser: XMindParser;
    export = xmindparser;
  }