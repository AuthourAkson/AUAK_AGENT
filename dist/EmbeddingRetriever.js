import { logTitle } from "./utils.js";
import VectorStore from "./VectorStore.js";
import { spawnSync } from 'child_process';
import path from 'path';
import 'dotenv/config';
export default class EmbeddingRetriever {
    async processFile(filePath) {
        try {
            const scriptPath = path.join(process.cwd(), "src", "parsefile.py");
            const { stdout, stderr } = spawnSync('python', [scriptPath, filePath]);
            if (stderr?.length) {
                console.error(`Python错误: ${stderr.toString()}`);
                return;
            }
            const content = stdout.toString();
            if (content) {
                await this.embedDocument(content);
            }
        }
        catch (error) {
            console.error(`处理失败: ${filePath}`, error);
        }
    }
    constructor(embeddingModel) {
        this.embeddingModel = embeddingModel;
        this.vectorStore = new VectorStore();
    }
    async embedDocument(document) {
        logTitle('EMBEDDING DOCUMENT');
        const embedding = await this.embed(document);
        this.vectorStore.addEmbedding(embedding, document);
        return embedding;
    }
    async embedQuery(query) {
        logTitle('EMBEDDING QUERY');
        const embedding = await this.embed(query);
        return embedding;
    }
    async embed(document) {
        const response = await fetch(`${process.env.EMBEDDING_BASE_URL}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EMBEDDING_KEY}`,
            },
            body: JSON.stringify({
                model: this.embeddingModel,
                input: document,
                encoding_format: 'float',
            }),
        });
        const data = await response.json();
        console.log(data.data[0].embedding);
        return data.data[0].embedding;
    }
    async retrieve(query, topK = 3) {
        const queryEmbedding = await this.embedQuery(query);
        return this.vectorStore.search(queryEmbedding, topK);
    }
}
