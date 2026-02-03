window.InkWeatherConfig = {
    // 资源配置
    assets: {
        // 'local' 或 'npm'
        // local: 使用本地文件 (css/fonts/icons/js)
        // npm: 使用 CDN 加载 npm 包中的资源
        source: 'npm',

        // npm 模式下的 CDN 地址，支持自定义
        // 常用: 'https://cdn.jsdelivr.net/npm' 或 'https://unpkg.com'
        cdnBase: 'https://cdn.cbd.int',

        // 包名
        packageName: 'ink-weather-clock-static',

        // 版本，可用 'latest' 或具体版本号
        version: 'latest'
    },

    // 天气配置
    weather: {
        // 获取方式: 'geoapi' (自动浏览器定位), 'auto_ip' (自动IP定位,无弹窗), 'manual' (手动)
        // geoapi: 尝试浏览器定位 (会弹窗)
        // auto_ip: 使用 IP 定位 (适合 Kindle, 无弹窗)
        // manual: 使用下方 location 字段
        mode: 'auto_ip',

        // 城市ID 或 坐标 (经度,纬度)
        // 杭州: 101210101
        location: '101210101',

        // 天气 Key 或 JWT 配置
        // 模式: 'key', 'jwt', 或 'server' (Vercel API代理, 最安全)
        authMode: 'server',

        // API Key 模式下只填这个
        key: '',

        // JWT 模式配置 (如果不使用 JWT 可留空)
        jwt: {
            kid: 'YOUR_KEY_ID',       // 凭据ID (公钥ID)
            sub: 'YOUR_PROJECT_ID',   // 项目ID
            // 私钥内容 (请注意保密，前端项目暴露私钥并不安全，仅限个人本地使用)
            privateKey: `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`
        }
    }
};
