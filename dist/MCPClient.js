import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
export default class MCPClient {
    constructor(name, command, args, version) {
        this.transport = null;
        this.tools = [];
        this.isConnected = false;
        this.mcp = new Client({
            name,
            version: version || "0.0.1",
            keepAlive: true, // 启用长连接
            reconnect: true // 允许自动重连
        });
        this.command = command;
        this.args = args;
        this.command = command;
        this.args = args;
    }
    async checkAndReconnect() {
        if (!this.isConnected) {
            console.log("连接服务中...");
            await this.init();
        }
    }
    async init() {
        await this.connectToServer();
    }
    async serverInformaition() {
        await this.ServertoolInformation();
    }
    async close() {
        await this.mcp.close();
    }
    getTools() {
        return this.tools;
    }
    async callTool(name, params) {
        try {
            await this.checkAndReconnect(); // 每次调用工具前检查连接
            const result = await this.mcp.callTool({
                name,
                arguments: params,
            });
            console.log(`调用工具 ${name} 成功，结果:`, JSON.stringify(result));
            return result;
        }
        catch (error) {
            console.error(`调用工具 ${name} 失败:`, error);
            throw error;
        }
        finally {
            await this.close();
        }
    }
    async connectToServer() {
        try {
            this.transport = new StdioClientTransport({
                command: this.command,
                args: this.args,
            });
            await this.mcp.connect(this.transport);
            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                };
            });
        }
        catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
    ServertoolInformation() {
        console.log("Connected to server with tools:", this.tools.map(({ name }) => name));
    }
}
