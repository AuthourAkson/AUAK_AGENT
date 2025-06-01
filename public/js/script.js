// 右侧边栏交互功能
function initRightSidebar() {
    // 右侧标签切换
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 右侧功能初始化
    const addFileBtn = document.getElementById('addFileBtn');
    const removeButtons = document.querySelectorAll('.remove-file');
    
    // 深色模式切换功能
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // 从本地存储加载设置
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = isDarkMode;
        updateDarkMode(isDarkMode);

        darkModeToggle.addEventListener('change', function() {
            const isChecked = this.checked;
            updateDarkMode(isChecked);
            localStorage.setItem('darkMode', isChecked);
        });
    }
    
    // 右侧标签切换功能
    function switchTab(tabName) {
        // 更新标签状态
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 更新内容显示
        tabContents.forEach(content => {
            if (content.id === `${tabName}Tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
    
    // 事件监听
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // 添加文件功能
    if (addFileBtn) {
        addFileBtn.addEventListener('click', function() {
            const fileList = document.querySelector('#filesTab .settings-section:first-child');
            
            const newFile = document.createElement('div');
            newFile.classList.add('file-preview');
            
            const timestamp = new Date().getTime();
            const fileName = `新文件_${timestamp}.txt`;
            
            newFile.innerHTML = `
                <i class="fas fa-file-alt file-icon"></i>
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    <div class="file-size">0.5 MB</div>
                </div>
                <button class="remove-file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.insertBefore(newFile, this);
            
            // 为新文件添加删除事件
            newFile.querySelector('.remove-file').addEventListener('click', function() {
                this.closest('.file-preview').remove();
            });
        });
    }
    
    // 文件删除功能
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filePreview = this.closest('.file-preview');
            if (filePreview) {
                filePreview.remove();
            }
        });
    });
    
    // MCP 服务按钮点击事件
    const mcpButtons = document.querySelectorAll('.mcp-button');
    mcpButtons.forEach(button => {
        button.addEventListener('click', function() {
            const serviceName = this.querySelector('.mcp-button-text').textContent;
            const serviceId = this.dataset.service;
            const status = this.querySelector('.mcp-button-status').textContent;
            
            // 在消息容器中显示激活的服务
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.innerHTML += `
                    <div class="message message-assistant">
                        <div class="message-header">
                            <i class="fas fa-server message-icon"></i> MCP 服务激活
                        </div>
                        <p>您已激活服务: <strong>${serviceName}</strong></p>
                        <p>服务ID: ${serviceId}</p>
                        <p>当前状态: ${status}</p>
                    </div>
                `;
                // 滚动到底部
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    });
}

// 更新深色模式状态
function updateDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    
    // 更新图标栏样式
    const secondarySidebar = document.getElementById('sidebarSecondary');
    if (secondarySidebar) {
        secondarySidebar.classList.toggle('dark-mode', isDark);
    }
    
    // 更新主侧边栏样式
    const primarySidebar = document.getElementById('sidebarPrimary');
    if (primarySidebar) {
        primarySidebar.classList.toggle('dark-mode', isDark);
    }
    
    // 更新右侧边栏样式
    const rightSidebar = document.querySelector('.sidebar-right');
    if (rightSidebar) {
        rightSidebar.classList.toggle('dark-mode', isDark);
    }
}

// 初始化时应用深色模式
document.addEventListener('DOMContentLoaded', function() {
    initRightSidebar();
    
    // 检查本地存储中的深色模式设置
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        updateDarkMode(true);
    }
});