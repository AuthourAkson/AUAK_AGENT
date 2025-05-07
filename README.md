# AUAK_AGENT

## 目标

- **Augmented LLM** (Chat + MCP + RAG)
  
  -可实时进行对话
- 不依赖框架
  - LangChain, LlamaIndex, CrewAI, AutoGen
- **MCP**
  - 支持配置多个MCP Serves
- **RAG** 极度简化板
  - 从知识中检索出有关信息，注入到上下文
- **任务**
  - 阅读网页 → 整理一份总结 → 保存到文件
  - 本地文档 → 查询相关资料 → 注入上下文
  - 转换文档 → 加入到知识库 → 启动时加载 

## **The augmented LLM**

- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)

![image.png](./images/image.png)

```mermaid
classDiagram
    class Agent {
        +init()
        +close()
        +invoke(prompt: string)
        -mcpClients: MCPClient[]
        -llm: ChatOpenAI
        -model: string
        -systemPrompt: string
        -context: string
    }
    class ChatOpenAI {
        +chat(prompt?: string)
        +appendToolResult(toolCallId: string, toolOutput: string)
        -llm: OpenAI
        -model: string
        -messages: OpenAI.Chat.ChatCompletionMessageParam[]
        -tools: Tool[]
    }
    class EmbeddingRetriever {
        +embedDocument(document: string)
        +embedQuery(query: string)
        +retrieve(query: string, topK: number)
        -embeddingModel: string
        -vectorStore: VectorStore
    }
    class MCPClient {
        +init()
        +close()
        +getTools()
        +callTool(name: string, params: Record<string, any>)
        -mcp: Client
        -command: string
        -args: string[]
        -transport: StdioClientTransport
        -tools: Tool[]
    }
    class VectorStore {
        +addEmbedding(embedding: number[], document: string)
        +search(queryEmbedding: number[], topK: number)
        -vectorStore: VectorStoreItem[]
    }
    class VectorStoreItem {
        -embedding: number[]
        -document: string
    }

    Agent --> MCPClient : uses
    Agent --> ChatOpenAI : interacts with
    ChatOpenAI --> ToolCall : manages
    EmbeddingRetriever --> VectorStore : uses
    VectorStore --> VectorStoreItem : contains
```

## **依赖**

```bash
pnpm install
pnpm add dotenv openai @modelcontextprotocol/sdk chalk**
```

## *安装uv并配置到环境变量

## LLM

- [pro/Deepseek v3](https://platform.openai.com/docs/api-reference/chat)

## MCP

- [MCP 架构](https://modelcontextprotocol.io/docs/concepts/architecture)
- [MCP Client](https://modelcontextprotocol.io/quickstart/client)
- [Fetch MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/fetch)
- [Filesystem MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)

## RAG

- [Retrieval Augmented Generation](https://scriv.ai/guides/retrieval-augmented-generation-overview/)
  - 译文: https://www.yuque.com/serviceup/misc/cn-retrieval-augmented-generation-overview
- 各种Loaders: https://python.langchain.com/docs/integrations/document_loaders/
  - [硅基流动](https://cloud.siliconflow.cn/models)
- [json数据](https://jsonplaceholder.typicode.com/)

## 向量STORE(对数据进行向量化处理并检索)

- 维度
- 模长
- 点乘 Dot Product
  - 对应位置元素的积，求和
- 余弦相似度 cos
  - 1 → 方向完全一致
  - 0 → 垂直
  - -1 → 完全想法

![image.png](./images/image1.png)

![image.png](./images/image2.png)

![image.png](./images/image3.png)

![image.png](./images/image4.png)
