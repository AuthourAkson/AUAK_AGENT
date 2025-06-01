// 对话数据存储（挂载到window对象实现跨文件共享）
window.conversations = [];
window.currentConversationId = null;

// 初始化对话列表（增强空数据处理）
function initConversations() {
    // 从本地存储加载对话
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        window.conversations = JSON.parse(savedConversations);
    }

    // 空数据时创建默认对话
    if (window.conversations.length === 0) {
        createNewConversation(true); // 静默创建
    } else {
        window.currentConversationId = window.conversations[0].id;
    }
    
    renderConversationList();
    loadConversation(window.currentConversationId);
    
    // 触发自定义事件通知系统就绪
    document.dispatchEvent(new CustomEvent('conversationsReady'));
}

// 生成唯一ID（保持原有逻辑）
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 渲染对话列表（优化active状态判断）
function renderConversationList() {
    const listElement = document.getElementById('conversationList');
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    const sortedConversations = [...window.conversations].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt));
    
    sortedConversations.forEach(conv => {
        const item = document.createElement('li');
        item.className = `conversation-item ${conv.id === window.currentConversationId ? 'active' : ''}`;
        
        const date = new Date(conv.createdAt);
        const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        let title = conv.title || '新对话';
        if (!conv.title && conv.messages.length > 0) {
            const firstMessage = conv.messages[0].content;
            title = firstMessage.length > 20 ? firstMessage.substring(0, 20) + '...' : firstMessage;
        }
        
        item.innerHTML = `
            <div class="conversation-header">
                <span class="conversation-date">${dateStr}</span>
                <div class="conversation-actions">
                    <div class="action-column">
                        <button class="rename-conversation-btn" aria-label="重命名对话">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="set-prompt-btn" aria-label="设置Prompt">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                    <div class="action-column">
                        <button class="delete-conversation-btn" aria-label="删除对话">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <span class="conversation-title">${title}</span>
        `;
        
        // 点击事件处理
        item.addEventListener('click', () => {
            if (conv.id !== window.currentConversationId) {
                window.currentConversationId = conv.id;
                loadConversation(conv.id);
            }
            if (typeof showSecondary === 'function') showSecondary();
        });
        
        // 删除按钮事件
        const deleteBtn = item.querySelector('.delete-conversation-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                deleteConversation(conv.id, e)
                    .then(deleted => {
                        if (deleted) {
                            // 如果删除的是当前对话，重新加载
                            if (conv.id === window.currentConversationId) {
                                loadConversation(window.currentConversationId);
                            }
                        }
                    });
            });
        }
        
        // 重命名按钮事件
        const renameBtn = item.querySelector('.rename-conversation-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // 新增
                
                // 添加调试信息
                console.log('Rename button clicked for conversation:', conv.id);
                
                renameConversation(conv.id, conv.title || '')
                    .then(success => {
                        console.log('Rename operation completed:', success);
                        if (success) {
                            if (conv.id === window.currentConversationId) {
                                loadConversation(conv.id);
                            }
                            // 添加视觉反馈
                            const titleElement = item.querySelector('.conversation-title');
                            titleElement.classList.add('rename-highlight');
                            setTimeout(() => {
                                titleElement.classList.remove('rename-highlight');
                            }, 500);
                        }
                    })
                    .catch(err => {
                        console.error('Rename error:', err);
                    });
            });
        }

        // 设置Prompt按钮事件
        const setPromptBtn = item.querySelector('.set-prompt-btn');
        if (setPromptBtn) {
            setPromptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                // 获取当前对话
                const conversation = window.conversations.find(c => c.id === conv.id);
                if (!conversation) {
                    console.warn('对话不存在，无法设置指令');
                    return;
                }

                // 打开对话框
                setConversationPrompt(conv.id, conversation.prompt || '')
                    .then(success => {
                        if (success) {
                            // 视觉反馈
                            const dateElement = item.querySelector('.conversation-date');
                            dateElement.classList.add('prompt-updated');
                            setTimeout(() => dateElement.classList.remove('prompt-updated'), 800);
                        }
                    })
                    .catch(err => console.error('指令设置失败:', err));
            });
        }
        
        listElement.appendChild(item);
    });
    
    saveConversations();
}

// 新建对话（增强返回值和静默模式）
function createNewConversation(silent = false) {
    // 静默模式直接创建
    if (silent) {
        return createConversation('新对话');
    }

    // 创建对话框元素
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.style.display = 'flex'; // 立即显示
    dialog.innerHTML = `
        <div class="dialog-card">
            <div class="dialog-header">
                <h3>新建对话</h3>
                <button class="dialog-close">&times;</button>
            </div>
            <div class="dialog-body">
                <i class="dialog-icon fas fa-comment-medical" style="color:#4CAF50"></i>
                <input type="text" id="conversationTitle" 
                       placeholder="输入对话标题（可选）" 
                       maxlength="50"
                       class="title-input">
            </div>
            <div class="dialog-footer">
                <button class="btn btn-cancel">取消</button>
                <button class="btn btn-confirm" style="background-color:#4CAF50">创建</button>
            </div>
        </div>
    `;

    // 插入到删除对话框后面
    const deleteDialog = document.getElementById('deleteDialog');
    deleteDialog.parentNode.insertBefore(dialog, deleteDialog.nextSibling);

    return new Promise((resolve) => {
        // 元素引用
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        const closeBtn = dialog.querySelector('.dialog-close');
        const titleInput = dialog.querySelector('#conversationTitle');

        // 自动聚焦输入框
        titleInput.focus();

        // 确认创建
        const handleConfirm = () => {
            const title = titleInput.value.trim() || '新对话';
            const newConv = createConversation(title);
            dialog.remove();
            resolve(newConv);
        };

        // 取消操作
        const handleCancel = () => {
            dialog.remove();
            resolve(null);
        };

        // 事件绑定
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
        dialog.addEventListener('click', (e) => e.target === dialog && handleCancel());
        titleInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleConfirm());
    });
}

// 实际创建对话的通用方法
function createConversation(title) {
    const newConversation = {
        id: generateId(),
        title: title.substring(0, 50), // 确保长度限制
        messages: [],
        createdAt: new Date().toISOString()
    };
    
    window.conversations.unshift(newConversation);
    window.currentConversationId = newConversation.id;
    
    renderConversationList();
    saveConversations();
    clearChatView();
    
    if (typeof showSecondary === 'function') {
        showSecondary();
    }
    
    return newConversation;
}

// 加载对话（统一使用window对象）
function loadConversation(conversationId) {
    const conversation = window.conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    window.currentConversationId = conversationId;
    renderConversationList();
    renderMessages(conversation.messages);
}

// 清空聊天视图（调用ChatUI方法）
function clearChatView() {
    if (window.chatUI && typeof window.chatUI.clearMessages === 'function') {
        window.chatUI.clearMessages();
    }
}

// 渲染消息（统一使用ChatUI渲染）
function renderMessages(messages) {
    if (!window.chatUI || !window.chatUI.renderMessage) return;
    
    clearChatView();
    messages.forEach(msg => {
        window.chatUI.renderMessage(msg);
    });
}

// 保存对话到本地存储（统一接口）
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(window.conversations));
}

// 更新对话标题（增加输入校验）
function updateConversationTitle(newTitle) {
    if (!newTitle || newTitle.trim().length === 0) return;
    
    const conversation = window.conversations.find(c => c.id === window.currentConversationId);
    if (conversation) {
        conversation.title = newTitle.trim().substring(0, 50); // 限制长度
        renderConversationList();
        saveConversations();
    }
}

// 删除对话（增强容错处理）
function deleteConversation(conversationId, event) {
    event.stopPropagation();
    const dialog = document.getElementById('deleteDialog');
    if (!dialog) {
        console.error('删除对话框未找到');
        return Promise.resolve(false);
    }

    // 显示对话框
    dialog.style.display = 'flex';
    
    return new Promise((resolve) => {
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        const closeBtn = dialog.querySelector('.dialog-close');

        // 清理函数
        const cleanUp = () => {
            dialog.style.display = 'none';
            // 清理事件监听
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
            dialog.removeEventListener('click', handleOverlayClick);
        };

        // 确认删除处理
        const handleConfirm = () => {
            // 执行删除
            window.conversations = window.conversations.filter(c => c.id !== conversationId);
            
            // 处理当前对话
            if (conversationId === window.currentConversationId) {
                if (window.conversations.length > 0) {
                    // 加载第一个对话
                    window.currentConversationId = window.conversations[0].id;
                    loadConversation(window.currentConversationId); // 新增关键调用
                } else {
                    // 创建新对话并加载
                    const newConv = createNewConversation(true);
                    window.currentConversationId = newConv.id;
                    loadConversation(newConv.id); // 新增关键调用
                }
            }
            
            // 更新界面
            renderConversationList();
            saveConversations();
            cleanUp();
            resolve(true);
        };

        // 取消处理
        const handleCancel = () => {
            cleanUp();
            resolve(false);
        };

        // 遮罩层点击处理
        const handleOverlayClick = (e) => {
            if (e.target === dialog) handleCancel();
        };

        // 绑定一次性事件
        confirmBtn.addEventListener('click', handleConfirm, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
        closeBtn.addEventListener('click', handleCancel, { once: true });
        dialog.addEventListener('click', handleOverlayClick, { once: true });
    });
}

// 重命名对话（增加验证逻辑）
function renameConversation(conversationId, currentTitle) {
    const dialog = document.getElementById('renameDialog');
    if (!dialog) {
        console.error('重命名对话框未找到');
        return Promise.resolve(false);
    }

    const inputField = dialog.querySelector('#renameInput');
    const errorHint = dialog.querySelector('.error-hint');
    const charCounter = dialog.querySelector('.char-counter');
    
    // 初始化对话框状态
    inputField.value = currentTitle || '';
    errorHint.style.display = 'none';
    charCounter.textContent = `${inputField.value.length}/50`;
    dialog.style.display = 'flex';
    inputField.focus();

    return new Promise((resolve) => {
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        const closeBtn = dialog.querySelector('.dialog-close');

        // 清理函数
        const cleanUp = () => {
            dialog.style.display = 'none';
            inputField.removeEventListener('input', handleInput);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
            dialog.removeEventListener('click', handleOverlayClick);
            inputField.removeEventListener('keypress', handleEnter);
        };

        // 输入处理
        const handleInput = (e) => {
            const value = e.target.value;
            charCounter.textContent = `${value.length}/50`;
            charCounter.style.color = value.length > 45 ? '#ff4444' : '#666';
        };

        // 确认处理
        const handleConfirm = () => {
            const newTitle = inputField.value.trim();
            if (!newTitle) {
                errorHint.textContent = '标题不能为空';
                errorHint.style.display = 'block';
                inputField.style.borderColor = '#ff4444';
                return;
            }

            if (newTitle === currentTitle) {
                cleanUp();
                return resolve(false);
            }

            const conversation = window.conversations.find(c => c.id === conversationId);
            if (conversation) {
                conversation.title = newTitle.substring(0, 50);
                renderConversationList();
                saveConversations();
            }
            cleanUp();
            resolve(true);
        };

        // 取消处理
        const handleCancel = () => {
            cleanUp();
            resolve(false);
        };

        // 遮罩层点击
        const handleOverlayClick = (e) => {
            if (e.target === dialog) handleCancel();
        };

        // 回车键支持
        const handleEnter = (e) => {
            if (e.key === 'Enter') handleConfirm();
        };

        // 事件绑定
        inputField.addEventListener('input', handleInput);
        confirmBtn.addEventListener('click', handleConfirm, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
        closeBtn.addEventListener('click', handleCancel, { once: true });
        dialog.addEventListener('click', handleOverlayClick, { once: true });
        inputField.addEventListener('keypress', handleEnter, { once: true });
    });
}

function setConversationPrompt(conversationId, currentPrompt) {
    // 参数验证
    if (!conversationId || !Array.isArray(window.conversations)) {
        console.error('无效的对话ID或对话列表');
        return Promise.resolve(false);
    }

    const dialog = document.getElementById('promptDialog');
    if (!dialog) {
        console.error('找不到指令设置对话框');
        return Promise.resolve(false);
    }

    // 获取对话框元素
    const textarea = dialog.querySelector('#promptInput');
    const errorHint = dialog.querySelector('.error-hint');
    const charCounter = dialog.querySelector('.char-counter');

    // 初始化对话框状态
    textarea.value = currentPrompt || '';
    errorHint.textContent = '';
    errorHint.style.display = 'none';
    charCounter.textContent = `${textarea.value.length}/500`;
    dialog.style.display = 'flex';
    textarea.focus();

    return new Promise((resolve) => {
        // 对话框元素引用
        const confirmBtn = dialog.querySelector('.btn-confirm');
        const cancelBtn = dialog.querySelector('.btn-cancel');
        const closeBtn = dialog.querySelector('.dialog-close');

        // 清理函数
        const cleanUp = () => {
            dialog.style.display = 'none';
            textarea.removeEventListener('input', handleInput);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
            dialog.removeEventListener('click', handleOverlayClick);
            textarea.removeEventListener('keydown', handleKeyDown);
        };

        // 输入处理
        const handleInput = (e) => {
            const value = e.target.value;
            charCounter.textContent = `${value.length}/500`;
            charCounter.style.color = value.length > 450 ? '#ff4444' : '#666';
        };

        // 确认处理
        const handleConfirm = () => {
            const newPrompt = textarea.value.trim();
            
            // 验证规则
            if (!newPrompt) {
                errorHint.textContent = '指令内容不能为空';
                errorHint.style.display = 'block';
                textarea.style.borderColor = '#ff4444';
                return;
            }

            // 查找对话
            const conversation = window.conversations.find(c => c.id === conversationId);
            if (!conversation) {
                console.error(`对话${conversationId}不存在`);
                cleanUp();
                return resolve(false);
            }

            // 无修改直接返回
            if (newPrompt === (conversation.prompt || '')) {
                cleanUp();
                return resolve(false);
            }

            // 保存数据
            conversation.prompt = newPrompt.substring(0, 500);
            saveConversations();
            
            // 关闭对话框
            cleanUp();
            resolve(true);
        };

        // 取消处理
        const handleCancel = () => {
            cleanUp();
            resolve(false);
        };

        // 遮罩层点击
        const handleOverlayClick = (e) => {
            if (e.target === dialog) handleCancel();
        };

        // 快捷键支持
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && e.ctrlKey) handleConfirm();
        };

        // 事件绑定
        textarea.addEventListener('input', handleInput);
        confirmBtn.addEventListener('click', handleConfirm, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
        closeBtn.addEventListener('click', handleCancel, { once: true });
        dialog.addEventListener('click', handleOverlayClick, { once: true });
        textarea.addEventListener('keydown', handleKeyDown, { once: true });
    });
}

function sendMessage() {
    const currentConv = window.conversations.find(c => c.id === window.currentConversationId);
    const systemPrompt = currentConv?.prompt || "默认指令";
}

// DOM初始化（添加事件协调）
document.addEventListener('DOMContentLoaded', () => {
    initConversations();
    document.getElementById('newConversationBtn').addEventListener('click', () => createNewConversation());
    document.getElementById('newChatBtn').addEventListener('click', () => createNewConversation());
});

// 初始化执行
initConversations();