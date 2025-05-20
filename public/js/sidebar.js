// DOM元素引用
const sidebarPrimary = document.getElementById('sidebarPrimary');
const sidebarSecondary = document.getElementById('sidebarSecondary');
const mainContent = document.getElementById('mainContent');
const primaryStatus = document.getElementById('primaryStatus');
const secondaryStatus = document.getElementById('secondaryStatus');
    
// 视图元素
const assistantView = document.getElementById('assistantView');
const historyView = document.getElementById('historyView');
    
// 按钮元素
const menuBtn = document.getElementById('menuBtn');
const newChatBtn = document.getElementById('newChatBtn');
const assistantBtn = document.getElementById('assistantBtn');
const historyBtn = document.getElementById('historyBtn');
const backBtn = document.getElementById('backBtn');
    
// 显示主侧边栏（默认显示助手视图）
function showPrimary() {
    sidebarPrimary.classList.add('active');
    sidebarSecondary.classList.add('hidden');
    mainContent.classList.add('primary-active');
    
    // 默认显示助手视图
    showAssistantView();
    
    updateStatus('打开', '关闭');
}
    
// 显示图标侧边栏
function showSecondary() {
    sidebarPrimary.classList.remove('active');
    sidebarSecondary.classList.remove('hidden');
    mainContent.classList.remove('primary-active');
    
    updateStatus('关闭', '打开');
}
    
// 显示助手视图
function showAssistantView() {
    assistantView.classList.add('active');
    historyView.classList.remove('active');
    
    // 更新按钮状态
    assistantBtn.classList.add('active');
    historyBtn.classList.remove('active');
}
    
// 显示历史视图
function showHistoryView() {
    assistantView.classList.remove('active');
    historyView.classList.add('active');
    
    // 更新按钮状态
    assistantBtn.classList.remove('active');
    historyBtn.classList.add('active');
}
    
// 更新状态显示
function updateStatus(primary, secondary) {
    if (primaryStatus) primaryStatus.textContent = primary;
    if (secondaryStatus) secondaryStatus.textContent = secondary;
}
    
// 事件监听
menuBtn.addEventListener('click', showPrimary);
assistantBtn.addEventListener('click', showAssistantView);
historyBtn.addEventListener('click', showHistoryView);
backBtn.addEventListener('click', showSecondary);