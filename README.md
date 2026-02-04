# Ink Weather Clock (墨水屏天气时钟)

这是一个基于 Web 的简约墨水屏天气时钟项目，支持和风天气 (QWeather) API。
本项目包含了一个 Vercel Serverless Function 代理 (`api/weather.js`)，可以在服务端安全地处理 API 密钥和 JWT 认证，而无需将敏感信息暴露给前端客户端。

## ✨ 特性

- **简约设计**：专为墨水屏设备设计。
- **安全认证**：支持服务端代理 (Serverless)，彻底隐藏 API Key / Private Key。
- **自动定位**：支持 IP 自动定位 (无弹窗) 和浏览器坐标定位。
- **多模式部署**：支持 Vercel 零配置部署，也支持静态文件托管。
- **CDN 加速**：支持配置 npm 包 CDN 加速静态资源加载。

---

## 📂 项目结构

```
├── api/                  # Vercel Serverless Functions (后端代理)
│   └── weather.js        # 天气 API 代理处理函数 (ES Module)
├── js/                   # 客户端逻辑 & 静态资源
│   ├── config.js         # 配置文件 (构建时由环境变量生成/本地手动配置)
│   ├── app.js            # 主应用程序逻辑
│   ├── loader.js         # 资源加载器 (处理 CDN/本地路径)
│   └── jose.min.js       # JWT 库 (仅在纯前端 JWT 模式下需要)
├── scripts/              # 构建工具
│   └── build-config.js   # 构建脚本：将环境变量注入到 js/config.js
├── public/               # 静态资源根目录
├── .env.example          # 环境变量示例文件
├── vercel.json           # Vercel 路由与重写配置
└── package.json          # 依赖管理与脚本
```

---

## 🚀 部署指南

推荐使用 **Vercel** 进行部署，既免费又支持 Serverless 函数，是最完美的运行环境。

### 方法一：Vercel 部署 (推荐)

1.  **Fork 或上传** 本项目到你的 GitHub 仓库。
2.  登录 [Vercel Dashboard](https://vercel.com/)，点击 **"Add New..."** -> **"Project"**，导入你的仓库。
3.  **构建配置**：
    *   **Framework Preset**: 选择 `Other` (或者留空，Vercel 会自动识别)。
    *   **Build Command**: `npm run build` (默认即可)。
    *   **Output Directory**: `.` (根目录，本配置已在 `vercel.json` 中预设，无需手动修改)。
4.  **环境变量 (Environment Variables)**：
    在部署页面的 "Environment Variables" 区域，添加以下变量 (根据你的认证方式二选一)：

    **【方式 A：使用 API Key (简单)】**
    *   `QWEATHER_KEY`: 填写你的和风天气 API Key。
    *   `WEATHER_AUTH_MODE`: `server`

    **【方式 B：使用 JWT (更安全)】**
    1.  **生成公私钥**：
        *   打开 [Key Generator Tool](https://tools.top/key-generator.html)。
        *   密钥类型选择 **Ed25519**。
        *   输出格式选择 **PEM**。
        *   点击生成，复制 **私钥 (Private Key)** 的内容备用。
        *   复制 **公钥 (Public Key)** 的内容，并在和风天气控制台创建项目密钥时填入。
    2.  **配置 Vercel 变量**：
        *   `QWEATHER_JWT_KEY`: 粘贴生成的私钥内容 (只粘贴中间的 Base64 密钥代码，无需包含 `-----BEGIN/END...` 头尾)。
        *   `QWEATHER_JWT_KID`: 填写和风控制台创建项目时生成的 Key ID。
        *   `QWEATHER_JWT_SUB`: 填写和风控制台的项目 ID (Project ID)。
        *   `WEATHER_AUTH_MODE`: `server`

    **【可选配置】**
    *   `WEATHER_LOCATION`: 默认城市 ID (例如 `101210101` 代表杭州，如果不填默认为杭州)。
    *   `CDN_BASE`: 如果你想使用特定的 CDN (如 `https://cdn.cbd.int`)。
    *   `ASSETS_SOURCE`: `npm` (使用 CDN) 或 `local` (使用当前部署的静态文件，推荐 `npm` 除非CDN在你所在地区连通性不佳)。

5.  点击 **Deploy**。等待部署完成后，访问生成的域名即可。

### 方法二：本地开发 / 传统服务器部署

1.  **安装依赖**：
    ```bash
    npm install
    ```

2.  **配置环境**：
    复制 `.env.example` 为 `.env`，并填入你的 Key。
    ```bash
    cp .env.example .env
    ```
    *注意：在本地开发时，你需要手动修改 `js/config.js` 或者运行构建命令来生成配置。*

3.  **生成配置**：
    ```bash
    npm run build
    ```
    这将根据 `.env` 文件或系统环境变量重新生成 `js/config.js`。

4.  **启动开发预览**：
    推荐使用 Vercel CLI 在本地模拟 Serverless 环境：
    ```bash
    npm i -g vercel
    vercel dev
    ```
    如果不使用 API 代理 (纯静态模式)，可以直接用 Live Server 打开 `index.html`。

---

## ⚙️ 配置说明 (js/config.js)

通常情况下，你不需要手动修改此文件，它会由构建脚本自动生成。

### 核心配置项

| 配置项 | 说明 | 可选值 |
| :--- | :--- | :--- |
| **assets.source** | 资源加载源 | `'local'` (本地文件) / `'npm'` (CDN 加载) |
| **assets.cdnBase** | CDN 前缀 | 例: `https://cdn.cbd.int` |
| **weather.mode** | 定位模式 | `'auto_ip'` (推荐,无弹窗), `'geoapi'` (浏览器弹窗定位), `'manual'` (固定城市) |
| **weather.authMode** | **认证模式 (重要)** | `'server'` (Vercel代理), `'jwt'` (纯前端JWT, 不推荐), `'key'` (纯前端Key) |

### 关于认证模式

1.  **Server (推荐)**: 前端请求 `/api/weather`，后端 Node.js 附带 Key 去请求和风天气。**最安全，Key 不会泄露。**
2.  **JWT**: 前端直接生成 JWT Token。需要将私钥暴露给前端，**极度不安全**，仅供学习或特殊内网环境使用。
3.  **Key**: 前端请求直接拼接 Key。**Key 会直接暴露**，容易被盗用，仅限测试。

---

## 🛠️ 常见问题

**Q: 为什么 API 返回 502 / Upstream API Error？**
A: 请检查 Vercel 环境变量中 `QWEATHER_KEY` 或 JWT 配置是否正确。另外和风天气免费版 API (devapi) 有 QPS 限制，过快请求可能会报错。

**Q: 为什么打开是空白？**
A: 打开浏览器控制台 (F12) -> Console。
- 如果显示 404，可能是 `assets.source` 设置为 `npm` 但 npm 包版本不对或CDN源连通性不佳。建议先改为 `local` 部署。
- 如果显示 API Error，请检查网络或 Key 配置。

**Q: 如何发布到 NPM 并使用 CDN？**
A: 如果你想让其他人通过 CDN 引用你修改后的资源：
1. 修改 `package.json` 中的 `version`。
2. 运行 `npm publish`。
3. 也可以配置 `js/config.js` 中的 `version` 为具体版本号或 `latest`。

**Q: 本地开发时 API 请求失败？**
A: 本地直接打开 `index.html` 是无法使用 `/api/weather` 代理的（因为它需要后端环境）。本地开发建议使用 `vercel dev`，或者临时将 `js/config.js` 中的 `authMode` 改为 `key` 并填入 Key (测试完记得删掉)。
