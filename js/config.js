window.InkWeatherConfig = {
    assets: {
        source: 'npm', 
        cdnBase: 'https://cdn.cbd.int',
        packageName: 'ink-weather-clock-static',
        version: 'latest'
    },
    weather: {
        mode: 'auto_ip',
        location: '101210101',
        authMode: 'server',
        
        // Credentials are handled server-side in Vercel Functions (api/weather.js)
        // Keep these empty for client security
        key: '',
        jwt: {
            kid: '',
            sub: '',
            privateKey: ''
        }
    }
};