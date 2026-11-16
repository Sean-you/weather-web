window.InkWeatherConfig = {
    assets: {
        // 'local' = 用本仓库自己的 js/css/fonts，不再依赖 cdn.cbd.int
        // 好处：国内访问不受第三方 CDN 连通性影响，且前端代码与后端补丁同版本
        source: 'local',
        cdnBase: 'https://cdn.cbd.int',
        packageName: 'ink-weather-clock-static',
        version: '1.0.6'
    },
    weather: {
        mode: 'auto_ip',
        location: '101210101',
        // 必须是 'server'：走 /api/weather 代理，Key 留在服务端
        // 写成 'key' 会让浏览器直连和风天气，撞上已停服的旧域名 → 404 / 403
        authMode: 'server',

        key: '',
        jwt: {
            kid: '',
            sub: '',
            privateKey: ''
        }
    }
};
