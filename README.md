# Ink Weather Clock (墨水屏天气时钟)

一个专为墨水屏设备（如 Kindle、墨水屏浏览器）设计的极简天气时钟网页。  
支持 **自动 IP 定位**、**农历/阳历显示的**、**实时天气**以及**每日一言**，并采用了安全的 Serverless代理 架构来保护 API 密钥。

## ✨ 功能特点

*   **专为墨水屏优化**：高对比度、大字体、无多余动画的黑白风格界面。
*   **智能定位**：
    *   `auto_ip` 模式：支持通过 IP（uapis.cn）自动获取经纬度，无需 GPS 权限弹窗，完美适配 Kindle。
    *   `geoapi` 模式：支持浏览器原生 Geolocation 定位。
    *   `manual` 模式：支持固定城市 ID。
*   **安全架构**：
    *   支持 Vercel Serverless Function 代理 (`api/weather.js`)，**彻底隐藏**和风天气 API Key/私钥，防止前端泄露。
    *   支持和风天气 **JWT (推荐)** 和 **API Key** 两种认证方式。
*   **灵活部署**：
    *   支持 Vercel 一键部署。
    *   支持 NPM CDN 资源加载 (`npm` 模式) 或本地资源加载 (`local` 模式)。

## 🚀 部署指南 (Vercel)

本项目已经配置好 Vercel 部署环境，推荐使用 Vercel 进行托管以启用安全代理功能。

1.  **Fork 本项目** 到您的 GitHub 账号。
2.  在 Vercel 中 **Import** 该项目。
3.  在 **Environment Variables** (环境变量) 设置中添加以下配置：

    | 变量名 | 必填 | 描述 |
    | :--- | :--- | :--- |
    | `WEATHER_AUTH_MODE` | 否 | 认证模式，默认为 `server` (推荐)。 |
    | `WEATHER_LOCATION` | 否 | 默认城市ID，默认 `101210101` (杭州)。 |
    | **以下配置二选一** | | |
    | **[JWT 模式]** (推荐) | | 需要在和风控制台创建 JWT 凭据 |
    | `QWEATHER_JWT_KEY` | 是 | 您的 Ed25519 **私钥**完整内容 (包含 `BEGIN...` 和换行)。 |
    | `QWEATHER_JWT_KID` | 是 | 您的 Key ID (`kid`)。 |
    | `QWEATHER_JWT_SUB` | 是 | 您的 Project ID (`sub`)。 |
    | **[API Key 模式]** | | |
    | `QWEATHER_KEY` | 是 | 您的和风天气 API Key。 |

4.  点击 **Deploy**。

## ⚙️ 本地开发 & 配置

### 1. 配置文件 `js/config.js`

项目根目录下的 `js/config.js` 控制着前端行为。  
在 Vercel 部署时，构建脚本会自动根据环境变量生成此文件（不含私钥，仅含 `authMode: 'server'` 配置）。

如果您在本地运行或希望自定义前端行为，可手动修改：

```javascript
window.InkWeatherConfig = {
    assets: {
        // 'local': 使用本地 /css, /js 等文件
        // 'npm': 使用 CDN 加载 npm 包资源 (适合纯静态托管)
        source: 'local', 
        // ...
    },
    weather: {
        // 定位模式: 'auto_ip' (Kindle推荐), 'geoapi', 'manual'
        mode: 'auto_ip', 
        
        // 认证模式: 
        // 'server': 请求 /api/weather (需后端支持)
        // 'key' / 'jwt': 前端直接请求和风天气 (警告: 会导致 Key 泄露)
        authMode: 'server'
    }
};
```

### 2. NPM 资源包

本项目已发布到 NPM: [ink-weather-clock](https://www.npmjs.com/package/ink-weather-clock)
包含所有静态资源（fonts, icons, css）。您可以通过修改 `config.js` 中的 `version` 来锁定特定版本资源。

## 🔋 适配 Kindle

1.  确保部署后的网站支持 HTTPS。
2.  在 Kindle 浏览器中输入您的 Vercel 域名。
3.  因为使用了 `auto_ip` 模式和 `uapis.cn` 接口，Kindle **不会** 弹出无法点击的“位置权限请求”，而是直接显示您当地的天气。
4.  建议在 Kindle 浏览器设置中开启“Disable Web Security”或类似选项（如果在极老旧设备上遇到 CORS 问题），但在本项目的新架构下通常不需要。

## 🛠️ 技术栈

*   **HTML/CSS/JS**: 原生开发，无重型框架依赖。
*   **Vercel Serverless**: Node.js 后端代理 (`/api/weather.js`)。
*   **Jose**: 用于 JWT 签名 (EdDSA/Ed25519)。
*   **QWeather GeoAPI & Weather API**: 天气数据源。

## 📄 License

ISC
