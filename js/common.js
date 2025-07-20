// 通用功能
function shuffleArray(array) {
    let arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 格式化时间
function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString();
}

// 显示404页面
function show404Page() {
    hideAllInterfaces();
    document.getElementById('notFoundInterface').style.display = 'block';
}

// 隐藏所有界面
function hideAllInterfaces() {
    document.getElementById('loginInterface').style.display = 'none';
    document.getElementById('ownerDashboard').style.display = 'none';
    document.getElementById('clientInterface').style.display = 'none';
    document.getElementById('notFoundInterface').style.display = 'none';
}

// 检查是否为Owner
function isValidOwner(username) {
    return username.toLowerCase() === 'owner' || username.toLowerCase() === 'admin';
} 