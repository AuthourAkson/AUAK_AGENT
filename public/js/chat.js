//chat.js
class ChatUI {
  constructor() {
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');

    if (!this.messageInput || !this.sendButton) {
      throw new Error('关键DOM元素未找到,请检查HTML和脚本加载顺序');
    }

    // 直接把 sendMessage 设为一个 async 方法，并绑定 this
    this.sendMessage = this.sendMessage.bind(this);
  }

  init() {
    this.sendButton.addEventListener('click', this.sendMessage);
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 文本框高度自适应
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
      console.error('消息容器未找到,请检查HTML中的messagesContainer元素');
      return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}-message`;
    messageDiv.innerHTML = `
      <div class="avatar ${message.role}-avatar">
        ${message.role === 'user' ? '你' : 'AI'}
      </div>
      <div class="message-content">${message.content}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 关键——把 sendMessage 定义为类的方法，前面加 async
  async sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content) return;

    // 1. 保存用户消息
    const conversation = window.conversations.find(c => c.id === window.currentConversationId);
    conversation.messages.push({
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('conversations', JSON.stringify(window.conversations));
    this.renderMessage({ role: 'user', content });

    // 2. 清空输入框
    this.messageInput.value = '';

    // 3. 调用后端接口
    try {
      const conversation = window.conversations.find(c => c.id === window.currentConversationId);
      if (!conversation) throw new Error('对话不存在');

      // 发送标准消息（包含当前prompt）
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: window.currentConversationId,
          message: content,
          prompt: conversation.prompt || '' // 自动附加当前prompt
        })
      });
      const { ok, reply, error } = await response.json();
      if (!ok) throw new Error(error);

      // 4. 渲染 AI 回复
      this.renderMessage({ role: 'assistant', content: reply });
      conversation.messages.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('conversations', JSON.stringify(window.conversations));

    } catch (err) {
      console.error('聊天出错:', err);
      this.renderMessage({ role: 'assistant', content: '⚠️ AI 服务出错，请稍后重试' });
    }
  }
}

// DOM加载完成后初始化
document.addEventListener('conversationsReady', () => {
  try {
    const chatUI = new ChatUI();
    chatUI.init();
    window.chatUI = chatUI;
    loadConversation(window.currentConversationId);
  } catch (error) {
    console.error('初始化失败:', error);
  }
});
