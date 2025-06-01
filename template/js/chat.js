// UI交互模块 - 负责消息处理和用户交互
class ChatUI {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');

        if (!this.messageInput || !this.sendButton) {
            throw new Error('关键DOM元素未找到，请检查HTML和脚本加载顺序');
        }

        this.sendMessage = this.sendMessage.bind(this);
        this.handleSendMessage = this.handleSendMessage.bind(this);
    }

    init() {
        this.sendButton.addEventListener('click', this.handleSendMessage);
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // 自适应文本高度
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
        });
    }

    clearMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) messagesContainer.innerHTML = '';
    }

    renderMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) {
            console.error('消息容器未找到！请检查HTML中的messagesContainer元素');
            return;
        }

        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}-message`;

        // 格式化消息内容，保留换行符
        const formattedContent = message.content.replace(/\n/g, '<br>');

        messageDiv.innerHTML = `
            <div class="avatar ${message.role}-avatar">
                ${message.role === 'user' ? '你' : 'AI'}
            </div>
            <div class="message-content">${formattedContent}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    async handleSendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;

        // 获取当前对话
        const conversation = window.conversations.find(c => c.id === window.currentConversationId);
        if (!conversation) {
            console.error('当前对话不存在');
            this.renderMessage({
                role: 'assistant',
                content: '对话初始化失败，请尝试新建对话',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 创建用户消息对象
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        };

        // 立即渲染用户消息（优化用户体验）
        this.renderMessage(userMessage);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto'; // 重置输入框高度

        // 保存到对话历史（先保存用户消息）
        conversation.messages.push(userMessage);
        this.saveConversations();

        try {
            // 构建请求数据（包含当前prompt）
            const requestData = {
                conversationId: window.currentConversationId,
                message: content,
                prompt: conversation.prompt || '', // 当前对话的prompt
                lastMessages: conversation.messages
                    .slice(-4) // 发送最近4条消息作为上下文
                    .map(m => ({ role: m.role, content: m.content }))
            };

            // 显示"思考中"状态
            const thinkingId = `thinking-${Date.now()}`;
            this.renderMessage({
                role: 'assistant',
                content: '<div class="thinking-dots"><span>.</span><span>.</span><span>.</span></div>',
                timestamp: '正在思考',
                tempId: thinkingId
            });

            // 发送到后端API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': thinkingId // 用于跟踪请求
                },
                body: JSON.stringify(requestData)
            });

            // 移除"思考中"状态
            this.removeTempMessage(thinkingId);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `请求失败: ${response.status}`);
            }

            // 处理AI回复
            const aiMessage = {
                role: 'assistant',
                content: data.reply,
                timestamp: new Date().toISOString(),
                promptUsed: conversation.prompt ? true : false // 标记是否使用了prompt
            };

            // 保存并渲染AI回复
            conversation.messages.push(aiMessage);
            this.saveConversations();
            this.renderMessage(aiMessage);

            // 自动滚动到底部
            this.scrollToBottom();

        } catch (error) {
            console.error('消息发送失败:', error);

            // 错误消息（保留用户原始消息）
            const errorMessage = {
                role: 'assistant',
                content: `抱歉，处理消息时出错: ${error.message}`,
                timestamp: new Date().toISOString(),
                isError: true
            };

            this.renderMessage(errorMessage);

            // 重试逻辑（可选）
            if (confirm('发送失败，是否重试？')) {
                this.messageInput.value = content;
                this.handleSendMessage();
            }
        }
    }


    saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(window.conversations));
    }
}

// DOM加载完成后初始化
document.addEventListener('conversationsReady', () => {
    try {
        const chatUI = new ChatUI();
        chatUI.init();
        window.chatUI = chatUI;

        // 加载当前对话
        if (window.currentConversationId) {
            const conversation = window.conversations.find(c => c.id === window.currentConversationId);
            if (conversation) {
                chatUI.clearMessages();
                conversation.messages.forEach(msg => chatUI.renderMessage(msg));
            }
        }
    } catch (error) {
        console.error('聊天UI初始化失败:', error);

        // 显示错误信息给用户
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>聊天界面初始化失败，请刷新页面</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
});