import ChatOpenAI from "./ChatOpenAI.js";
import { logTitle } from "./utils.js";

export default class Agent {
    constructor(model, mcpClients, systemPrompt = '', context = '') {
        this.llm = null;
        this.mcpClients = mcpClients;
        this.model = model;
        this.systemPrompt = systemPrompt;
        this.context = context;
    }
    async init() {
        logTitle('TOOLS');
        for await (const client of this.mcpClients) {
            await client.init();
            await client.serverInformaition();
        }
        const tools = this.mcpClients.flatMap(client => client.getTools());
        this.llm = new ChatOpenAI(this.model, this.systemPrompt, tools, this.context);
    }
    async close() {
        for await (const client of this.mcpClients) {
            await client.close();
        }
    }
    async invoke(prompt) {
        if (!this.llm)
            throw new Error('Agent not initialized');
        let response = await this.llm.chat(prompt);
        while (true) {
            if (response.toolCalls.length > 0) {
                for (const toolCall of response.toolCalls) {
                    const mcp = this.mcpClients.find(client => client.getTools().some((t) => t.name === toolCall.function.name));
                    if (mcp) {
                        try {
                            console.log(`调用工具: ${toolCall.function.name}`);
                            const result = await mcp.callTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                            //console.log(`工具调用结果: ${JSON.stringify(result)}`);
                            //this.llm.appendToolResult(toolCall.id, JSON.stringify(result));
                            response.toolCalls = response.toolCalls.filter(tc => tc.id !== toolCall.id);
                        }
                        catch (error) {
                            console.error("工具调用过程中出错:", error);
                            this.llm.appendToolResult(toolCall.id, "工具调用失败");
                        }
                    }
                    else {
                        this.llm.appendToolResult(toolCall.id, '工具未找到');
                    }
                }
                response = await this.llm.chat();
                continue;
            }
            await this.close();
            return response.content;
        }
    }
}
