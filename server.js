import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import MCPClient from './dist/MCPClient.js';
import Agent from './dist/Agent.js';
import EmbeddingRetriever from './dist/EmbeddingRetriever.js';

const outDirName = 'output';

async function initializeRetriever() {
  const embeddingRetriever = new EmbeddingRetriever('BAAI/bge-m3');
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  const files = fs.readdirSync(knowledgeDir);

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    if (fs.statSync(filePath).isFile()) {
      const ext = path.extname(file).toLowerCase();
      try {
        if (ext === '.md' || ext === '.txt') {
          const content = fs.readFileSync(filePath, 'utf-8');
          await embeddingRetriever.embedDocument(content);
          console.log(`嵌入文本文件: ${file}`);
        } else if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xmind'].includes(ext)) {
          await embeddingRetriever.processFile(filePath);
          console.log(`嵌入复杂文件: ${file}`);
        } else {
          console.log(`跳过不支持的文件格式: ${file}`);
        }
      } catch (error) {
        console.error(`处理文件 ${file} 时出错:`, error);
      }
    }
  }

  console.log('知识库加载完成！');
  return embeddingRetriever;
}

async function retrieveContext(query, retriever) {
  const contextArray = await retriever.retrieve(query, 3);
  return contextArray.join('\n');
}

async function bootstrap() {

  const retriever = await initializeRetriever();

  const fetchMCP = new MCPClient('mcp-server-fetch', 'uvx', ['mcp-server-fetch']);
  const fileMCP = new MCPClient(
    'mcp-server-file',
    'npx',
    ['-y', '@modelcontextprotocol/server-filesystem', process.cwd(), outDirName]
  );
  const markdownifyMCP = new MCPClient(
    'markdownify',
    'node',
    ['D:/MyAgent/markdownify-mcp/dist/index.js']
  );

  await fetchMCP.init();
  await fileMCP.init();
  await markdownifyMCP.init();

  const agent = new Agent(
    'Pro/deepseek-ai/DeepSeek-V3',
    [fetchMCP, fileMCP, markdownifyMCP],
    '',
    ''
  );
  await agent.init();

  //启动 Express 服务
  const app = express();
  app.use(bodyParser.json());
  app.use(express.static(path.join(process.cwd(), 'public')));

  //定义聊天接口，带知识上下文，直接做到连贯的效果
  app.post('/api/chat', async (req, res) => {
    try {
      const { conversationId, message, prompt = '', isSystem = false } = req.body;

      // 构建完整的提示
      let fullPrompt = message;
      if (prompt) {
        fullPrompt = `${prompt}\n\n${message}`;
      }

      // 调用AI接口
      const aiReply = await agent.invoke(fullPrompt);

      // 系统消息不返回给前端显示
      if (isSystem) {
        return res.json({
          ok: true,
          silent: true, // 静默标记
          reply: "人设加载完成"
        });
      }

      // 正常聊天回复
      return res.json({
        ok: true,
        reply: aiReply
      });

    } catch (e) {
      console.error('API错误:', e);
      return res.status(500).json({
        ok: false,
        error: e.message,
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
      });
    }
  });

  // 5. 启动端口
  const port = process.env.PORT || 3000;
  app.listen(port, () =>
    console.log(`🚀 Server listening on http://localhost:${port}`)
  );
}

bootstrap();