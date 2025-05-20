import MCPClient from "./MCPClient.js";
import Agent from "./Agent.js";
import path from "path";
import EmbeddingRetriever from "./EmbeddingRetriever.js";
import fs from "fs";
import readline from "readline";
const outDirName = "output"; // 相对路径
const fetchMCP = new MCPClient("mcp-server-fetch", "uvx", ["mcp-server-fetch"]);
const fileMCP = new MCPClient("mcp-server-file", "npx", ["-y", "@modelcontextprotocol/server-filesystem", "D:/LLM+RAG+MCP", outDirName]);
const markdownifyMCP = new MCPClient("markdownify", "node", ["D:/MyAgent/markdownify-mcp/dist/index.js"] // 请根据实际路径修改
);
// 初始化 EmbeddingRetriever 并加载知识库
async function initializeRetriever() {
    const embeddingRetriever = new EmbeddingRetriever("BAAI/bge-m3");
    const knowledgeDir = path.join(process.cwd(), "knowledge");
    const files = fs.readdirSync(knowledgeDir);
    for (const file of files) {
        const filePath = path.join(knowledgeDir, file);
        if (fs.statSync(filePath).isFile()) {
            const ext = path.extname(file).toLowerCase();
            try {
                if (ext === ".md" || ext === ".txt") {
                    const content = fs.readFileSync(filePath, "utf-8");
                    await embeddingRetriever.embedDocument(content);
                    console.log(`嵌入文本文件: ${file}`);
                }
                else if ([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xmind"].includes(ext)) {
                    await embeddingRetriever.processFile(filePath);
                    console.log(`嵌入复杂文件: ${file}`);
                }
                else {
                    console.log(`跳过不支持的文件格式: ${file}`);
                }
            }
            catch (error) {
                console.error(`处理文件 ${file} 时出错:`, error);
            }
        }
    }
    console.log("知识库加载完成！");
    return embeddingRetriever;
}
// 根据用户问题从知识库中检索相关上下文
async function retrieveContext(query, retriever) {
    const context = (await retriever.retrieve(query, 3)).join("\n");
    return context;
}
// 主函数：启动对话循环
async function main() {
    const retriever = await initializeRetriever();
    await markdownifyMCP.init();
    const agent = new Agent("Pro/deepseek-ai/DeepSeek-V3", [fetchMCP, fileMCP, markdownifyMCP], "", "");
    await agent.init();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    console.log("知识库对话已启动。输入 'exit' 可退出。\n");
    rl.setPrompt("请输入您的问题：");
    rl.prompt();
    rl.on("line", async (line) => {
        const question = line.trim();
        if (question.toLowerCase() === "exit") {
            rl.close();
            return;
        }
        try {
            const context = await retrieveContext(question, retriever);
            const fullPrompt = `${context}\n\n${question}`;
            const response = await agent.invoke(fullPrompt);
            console.log(`\n回答:\n${response}\n`);
        }
        catch (error) {
            console.error("处理过程中发生错误：", error);
        }
        rl.prompt();
    });
    rl.on("close", async () => {
        await agent.close();
        await markdownifyMCP.close();
        console.log("会话已结束。");
        process.exit(0);
    });
}
main();
