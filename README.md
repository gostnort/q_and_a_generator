# Q&A Generator - Multi-Client Edition

A web-based Q&A quiz generator with advanced multi-client tracking and owner/client architecture. Features real-time client monitoring, custom password dialogs, and seamless session management.

## ✨ New Features (v0.2)

### 🔥 **Multi-Client Tracking**
- **Real client identification** based on login names
- **Individual client statistics** with scores and timestamps
- **Live client list** showing all connected users
- **Per-client answer history** with submission tracking

### 🔐 **Enhanced Password Security**
- **Custom password dialogs** with proper OK/Cancel handling
- **No unwanted browser prompts** - complete dialog control
- **Retry logic** for incorrect passwords
- **Clean cancellation** without error messages

### 👥 **Owner Priority System**
- **First owner becomes active** - controls the quiz
- **Other owners become clients** when someone else is active
- **Seamless role switching** when active owner logs out
- **Multi-owner support** with clear active owner indication

### 🎨 **Improved User Experience**
- **Clean UI** - quiz selection disappears after loading
- **Real-time updates** across all client sessions
- **Better session management** with automatic cleanup
- **Responsive design** with proper spacing

## How It Works

### For Owners
1. **Login**: Enter your registered email address
2. **Become Active Owner**: First owner to login controls the quiz
3. **Select Quiz**: Choose from available ZIP files in the `/zip` folder
4. **Monitor Real Clients**: View individual client names, scores, and answer statistics
5. **See Live Updates**: Watch as clients submit answers in real-time
6. **Logout**: End session and deactivate quiz for all clients

### For Clients (Including Other Owners)
1. **Login**: Enter any identifier when a quiz is active
2. **Take Quiz**: Complete the randomized questions
3. **Individual Tracking**: Your answers are tracked separately by your login name
4. **View Results**: See your score and correct answers
5. **Automatic Logout**: Return to login when active owner logs out

### Multi-Client Scenarios
```
Example with 3 owners configured:
- owner1@email.com logs in first → Becomes active owner
- owner2@email.com logs in → Becomes client (sees "owner1@email.com is active owner")
- owner3@email.com logs in → Also becomes client
- Regular users (John, Mary) → Also become clients
- All tracked separately with individual statistics
```

## File Structure

```
/
├── index.html          # Single entry point for all users
├── script.js           # Main application logic with multi-client support
├── styles.css          # Enhanced styling with client list
├── config.js           # Owner email configuration
├── zip/                # Quiz files directory
│   ├── .gitkeep       # Ensures directory is tracked
│   └── sample*.zip    # Sample quiz files
├── js7z/              # ZIP extraction library
├── _redirects         # Netlify routing configuration
├── netlify.toml       # Netlify build configuration
└── README.md          # This file
```

## Quiz File Format

ZIP files in the `/zip` folder should contain:
- **CSV file**: Questions and answers
  - Row 1: Question text
  - Row 2: Image filename (optional)
  - Row 3+: Answer options (prefix with `` ` `` for correct answers)
- **Image files**: Referenced in the CSV (optional)
- **Password protection**: Fully supported with custom dialogs

### Example CSV Structure:
```
"What is 2+2?","What color is the sky?","Which is larger?"
"","sky.jpg","elephant.jpg"
"`4","Blue","Elephant"
"3","`Blue","`Elephant"
"5","Green","Mouse"
"6","Red","Cat"
```

## Owner Configuration

Edit `config.js` to add authorized owner emails:

```javascript
const ownerIdentities = [
    'owner@example.com',
    'admin@example.com',
    'teacher@school.edu'
];
```

## Multi-Client Data Structure

Client answers are stored with individual tracking:
```javascript
{
    "John": [
        {answers: [...], timestamp: 123456, score: 85},
        {answers: [...], timestamp: 123789, score: 92}
    ],
    "Mary": [
        {answers: [...], timestamp: 123567, score: 78}
    ],
    "owner2@email.com": [
        {answers: [...], timestamp: 123678, score: 95}
    ]
}
```

## Deployment to Netlify

### Method 1: Drag & Drop
1. Zip the entire project folder
2. Go to [Netlify](https://netlify.com)
3. Drag the ZIP file to the deploy area
4. Your site will be live instantly

### Method 2: Git Integration
1. Push code to GitHub repository
2. Connect repository to Netlify
3. Netlify will auto-deploy on every push

### Method 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Adding Quiz Files

### Via GitHub (Recommended)
1. Upload ZIP files to the `/zip` folder in your repository
2. Commit and push changes
3. Netlify will automatically redeploy

### Via Netlify Interface
1. Go to your Netlify site dashboard
2. Go to "Site settings" → "Build & deploy" → "Environment variables"
3. Upload files through the file manager (if available)

## Local Development

For local testing, you need a web server due to CORS restrictions:

### Option 1: Python
```bash
python -m http.server 8000
```

### Option 2: Node.js
```bash
npx serve
```

### Option 3: Chrome Development Mode (Windows)
```bash
# Double-click launch_dev_chrome.bat
```

## Advanced Session Management

### Owner Session Control
- **Active Owner Tracking**: Only one owner can be active at a time
- **Complete Data Cleanup**: All quiz data cleared on owner logout
- **Session Isolation**: Each owner session is independent
- **Automatic Client Logout**: All clients return to login when owner logs out

### Client Session Features
- **Individual Identity Tracking**: Each login name = unique client
- **Answer History**: Multiple submissions tracked per client
- **Real-time Synchronization**: Instant updates across all sessions
- **Automatic Role Detection**: Owners become clients when another owner is active

## Security Features

- **Email-based Owner Authentication**: Only registered emails can access owner features
- **Owner Priority System**: First-come-first-served owner activation
- **Session Isolation**: Each session is completely independent
- **Automatic Cleanup**: All data cleared on owner logout
- **Answer Obfuscation**: Shared quizzes don't reveal correct answers easily
- **Custom Password Dialogs**: No browser security prompts

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript Required**: Full functionality requires JavaScript enabled
- **File API Support**: Required for ZIP file processing
- **LocalStorage Support**: Required for multi-client tracking

## Troubleshooting

### Quiz Not Loading
- Check if ZIP file exists in `/zip` folder
- Verify ZIP file contains valid CSV
- Check browser console for errors
- Try entering password if ZIP is protected

### Owner Can't Login
- Verify email is listed in `config.js`
- Check if another owner is already active
- Check for typos in email address
- Clear browser cache and try again

### Clients Can't Access Quiz
- Ensure an owner is logged in and has selected a quiz
- Check if quiz file loaded successfully
- Verify client is using correct URL
- Wait for active owner to start a quiz

### Password Dialog Issues
- Custom dialog should appear for password-protected ZIPs
- Click "OK" to submit password (dialog disappears immediately)
- Click "Cancel" to select different quiz
- Try again with correct password if extraction fails

## Technical Details

- **ZIP Processing**: Uses js7z library for client-side extraction
- **Session Storage**: localStorage for session management with multi-client support
- **Real-time Updates**: Storage events for cross-tab communication
- **Multi-Client Tracking**: Individual client identification and statistics
- **Password Handling**: Custom dialogs with proper event handling
- **Responsive Design**: Works on desktop and mobile devices
- **Print Support**: Built-in print functionality for quizzes

## Architecture Notes

### Client-Side Architecture
- **No Backend Required**: Pure client-side application
- **Static Hosting Compatible**: Perfect for Netlify, GitHub Pages, etc.
- **LocalStorage Based**: Multi-client tracking using browser storage
- **Real-time Sync**: Storage events for instant updates

### Scalability Considerations
- **Small to Medium Groups**: Ideal for classrooms, workshops, small teams
- **Single Device Limitation**: All clients must use the same browser/device family
- **Storage Limits**: LocalStorage has size limitations for very large datasets

### Production Recommendations
For large-scale deployment with many concurrent users across different devices, consider:
- **Backend Server**: For true multi-device support
- **WebSocket Support**: For real-time features across devices
- **Database Storage**: For persistent client data
- **User Authentication**: For secure multi-device sessions

---

## Version History

### v0.2 (Current)
- ✅ Multi-client tracking with individual identification
- ✅ Custom password dialogs with proper event handling
- ✅ Owner priority system with role switching
- ✅ Enhanced session management and cleanup
- ✅ Real-time client statistics and monitoring
- ✅ Improved UI/UX with clean interfaces

### v0.1
- ✅ Basic owner/client architecture
- ✅ ZIP file quiz loading
- ✅ Simple session management
- ✅ Basic quiz functionality

---

# Q&A Generator - 中文简介

基于Web的问答测验生成器，具有先进的多客户端跟踪和管理员/客户端架构。

## 新功能特性 (v0.2)

### 🔥 **多客户端跟踪**
- **真实客户端识别** - 基于登录名称
- **个人客户端统计** - 包含分数和时间戳
- **实时客户端列表** - 显示所有连接用户
- **每客户端答题历史** - 提交记录跟踪

### 🔐 **增强密码安全**
- **自定义密码对话框** - 正确的确定/取消处理
- **无浏览器提示** - 完全对话框控制
- **重试逻辑** - 密码错误重试
- **干净取消** - 无错误消息

### 👥 **管理员优先系统**
- **首个管理员激活** - 控制测验
- **其他管理员成为客户端** - 当有人已激活时
- **无缝角色切换** - 活跃管理员登出时
- **多管理员支持** - 明确活跃管理员指示

## 使用方法

### 管理员操作
1. **登录**：输入已注册的邮箱地址
2. **成为活跃管理员**：首个登录的管理员控制测验
3. **选择测验**：从 `/zip` 文件夹中选择测验文件
4. **监控真实客户端**：查看个人客户端姓名、分数和答题统计
5. **查看实时更新**：观看客户端实时提交答案
6. **登出**：结束会话并停用所有客户端的测验

### 客户端操作（包括其他管理员）
1. **登录**：在测验激活时输入任意标识符
2. **参加测验**：完成随机排序的题目
3. **个人跟踪**：您的答案按登录名称单独跟踪
4. **查看结果**：查看得分和正确答案
5. **自动登出**：活跃管理员登出时自动返回登录页面

## 部署到Netlify

### 方法1：拖拽部署
1. 将整个项目文件夹压缩
2. 访问 [Netlify](https://netlify.com)
3. 将ZIP文件拖拽到部署区域
4. 网站立即上线

### 方法2：Git集成
1. 将代码推送到GitHub仓库
2. 将仓库连接到Netlify
3. 每次推送自动部署

## 技术特点

- **多客户端跟踪**：基于登录名称的个人识别
- **自定义密码对话框**：完全控制的密码处理
- **管理员优先系统**：智能角色分配
- **实时同步**：跨标签页即时更新
- **完整数据清理**：管理员登出时清空所有数据
- **响应式设计**：桌面和移动设备完美适配

---

**版本**: v0.2 | **最后更新**: 2024年 | **许可证**: MIT