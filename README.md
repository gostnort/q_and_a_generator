# Q&A Generator from ZIP

This project is a web-based Q&A quiz generator. It dynamically creates a quiz from a `.zip` file containing a `.csv` file for questions and answers, along with any associated image files.

## Features

- **Dynamic Quiz Generation**: Creates quizzes from a user-provided `.zip` file.
- **CSV-Based**: Questions, options, and correct answers are defined in a structured `.csv` file.
- **Image Support**: Embeds images referenced in the CSV file directly into the questions.
- **Password Protection**: Supports password-protected `.zip` archives using the `js7z` library.
- **Customizable Quizzes**: Allows users to set the number of questions and the passing percentage.
- **Interactive Feedback**: Provides immediate scoring and visual feedback on correct/incorrect answers.

## How to Use

1.  **Prepare your ZIP file**:
    *   Create a `.csv` file with your questions. The first row should be the question text, the second row should be the image file name (optional), and subsequent rows are the answer options.
    *   To mark an answer as correct, prefix it with a backtick (`).
    *   Place the `.csv` file and any image files into a single `.zip` archive. You can optionally password-protect it.

2.  **Run the application**:
    *   Due to browser security policies (CORS), you cannot run this application by simply opening `index.html`. You must serve it from a local web server.
    *   If you have Python installed, navigate to the project directory in your terminal and run:
        ```bash
        python -m http.server
        ```
    *   If you have Node.js installed, you can use the `serve` package:
        ```bash
        npx serve
        ```
    *   Alternatively, you can use a tool like the "Live Server" extension in VS Code.

3.  **Open the Quiz**:
    *   Open your web browser and navigate to `http://localhost:8000` (or the address provided by your server tool).
    *   Click the "Generate" button, select your `.zip` file, enter the password if required, and configure your quiz settings.

---

# Q&A Generator - ZIP问答生成器

本项目是一个基于Web的问答测验生成器。它可以从一个包含`.csv`文件（用于定义问题和答案）及相关图像文件的`.zip`压缩包中动态创建一个测验。

## 功能特性

- **动态测验生成**: 从用户提供的`.zip`文件创建测验。
- **基于CSV**: 问题、选项和正确答案在结构化的`.csv`文件中定义。
- **支持图像**: 将CSV文件中引用的图像直接嵌入到问题中。
- **密码保护**: 使用`js7z`库支持受密码保护的`.zip`压缩文件。
- **可定制的测验**: 允许用户设置问题数量和及格百分比。
- **交互式反馈**: 提供即时评分和关于正确/错误答案的视觉反馈。

## 如何使用

1.  **准备您的ZIP文件**:
    *   创建一个`.csv`文件来存放您的问题。第一行应为问题文本，第二行应为图像文件名（可选），后续行为答案选项。
    *   要将某个答案标记为正确答案，请在其前面加上一个反引号 (`) 字符。
    *   将`.csv`文件和所有相关的图像文件放入一个`.zip`压缩包中。您可以选择使用密码保护它。

2.  **运行应用程序**:
    *   由于浏览器的安全策略（CORS），您不能通过简单地双击打开`index.html`来运行此应用。您必须通过本地Web服务器来运行它。
    *   如果您安装了Python，请在终端中进入项目目录并运行：
        ```bash
        python -m http.server
        ```
    *   如果您安装了Node.js，您可以使用`serve`包：
        ```bash
        npx serve
        ```
    *   或者，您也可以使用像VS Code中的"Live Server"之类的工具。

3.  **开始测验**:
    *   打开您的网络浏览器并访问`http://localhost:8000`（或您的服务器工具提供的地址）。
    *   点击"Generate"按钮，选择您的`.zip`文件，如果需要，请输入密码，并配置您的测验设置。