// 系统初始化模块 - 负责容器准备和全局状态管理


// 在historychat.js的删除操作前添加保护
function clearChatView() {
    if (document.querySelector('[data-locked="true"]')) {
        console.warn('容器已锁定，禁止清空操作');
        return;
    }
    // ...原有代码
}

// 增强版元素等待函数
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            
            if (element) {
                clearInterval(checkInterval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error(`等待元素超时: ${selector}`));
            }
        }, 100);
    });
}

// 创建应急消息容器
function createFallbackContainer() {
    console.warn('正在创建应急消息容器...');
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'messagesContainer-fallback';
    Object.assign(fallbackContainer.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '300px',
        height: '400px',
        backgroundColor: 'white',
        zIndex: '9999',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        padding: '10px',
        color: 'red',
        border: '2px solid red'
    });
    fallbackContainer.innerHTML = '<div>应急消息容器（系统自动创建）</div>';
    document.body.appendChild(fallbackContainer);
    return fallbackContainer;
}

async function initializeChatSystem() {
    try {
        console.log('正在初始化聊天系统...');

        // 1. 增强的DOM就绪等待
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                const checkReady = () => {
                    if (document.readyState === 'complete') {
                        console.log('DOM完全加载完成');
                        resolve();
                        return;
                    }
                    setTimeout(checkReady, 100);
                };
                checkReady();
            });
        }

        // 2. 多策略容器查找
        let messagesContainer;
        const containerSelectors = [
            '#messagesContainer', // ID选择器
            '.messages-container', // 类选择器
            'div[class*="messages-container"]', // 属性选择器
            'div[id*="messagesContainer"]' // 备用ID选择器
        ];

        for (const selector of containerSelectors) {
            messagesContainer = document.querySelector(selector);
            if (messagesContainer) {
                console.log(`使用 ${selector} 找到消息容器`);
                break;
            }
        }

        // 3. 应急容器处理
        if (!messagesContainer) {
            console.warn('所有选择器都无法找到消息容器，创建应急容器');
            messagesContainer = createFallbackContainer();
            
            // 尝试将容器插入到合理位置
            const possibleParents = [
                document.querySelector('.chat-container'),
                document.querySelector('.main-content'),
                document.body
            ].filter(Boolean);
            
            if (possibleParents.length > 0) {
                possibleParents[0].appendChild(messagesContainer);
            } else {
                document.body.appendChild(messagesContainer);
            }
        }

        // 4. 确保容器可见且可用
        messagesContainer.style.visibility = 'visible';
        messagesContainer.style.opacity = '1';
        messagesContainer.classList.add('active');

        // 5. 全局系统初始化
        window.chatSystem = {
            container: messagesContainer,
            version: '1.0',
            initializedAt: new Date().toISOString(),
            state: 'ready'
        };

        // 新增：在初始化完成后设置锁定属性
        window.chatSystem.container.setAttribute('data-locked', 'true');

        console.log('聊天系统初始化完成，容器:', messagesContainer);
        return messagesContainer;

    } catch (error) {
        console.error('初始化严重错误:', error);
        
        // 紧急恢复
        const fallbackContainer = createFallbackContainer();
        document.body.appendChild(fallbackContainer);
        
        window.chatSystem = {
            container: fallbackContainer,
            state: 'fallback',
            error: error.message
        };
        
        return fallbackContainer;
    }
}

// 全局诊断函数
window.diagnoseChat = function() {
    console.group('聊天系统诊断信息');
    console.log('当前消息容器:', window.chatSystem?.container);
    console.log('容器内容:', window.chatSystem?.container?.innerHTML);
    console.log('当前对话ID:', window.currentConversationId);
    console.log('对话列表:', window.conversations);
    console.groupEnd();
};

// 启动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initializeChatSystem();
        // 通知chat.js可以开始初始化UI
        document.dispatchEvent(new Event('chatSystemReady'));
    });
} else {
    setTimeout(async () => {
        await initializeChatSystem();
        document.dispatchEvent(new Event('chatSystemReady'));
    }, 0);
}
