const fs = require('fs');
const path = require('path');

// Read environment variables
// SECURITY: DO NOT read sensitive keys here. 
// Vercel build runs in the same env as runtime, so we must be careful NOT to inject secrets into client-side config.js.
// Since we are using authMode: 'server', keys are read by api/weather.js at runtime.

const location = process.env.WEATHER_LOCATION || '101210101';
// Default to 'server' mode for Vercel builds if not specified
const authMode = process.env.WEATHER_AUTH_MODE || 'server';

const configContent = `window.InkWeatherConfig = {
    assets: {
        source: 'npm', 
        cdnBase: 'https://cdn.jsdelivr.net/npm',
        packageName: 'ink-weather-clock',
        version: 'latest'
    },
    weather: {
        mode: 'auto_ip',
        location: '${location}',
        authMode: '${authMode}',
        
        // Credentials are handled server-side in Vercel Functions (api/weather.js)
        // Keep these empty for client security
        key: '',
        jwt: {
            kid: '',
            sub: '',
            privateKey: ''
        }
    }
};`;

// Output path: js/config.js
const outputPath = path.join(__dirname, 'js', 'config.js');

console.log('Generating config.js from environment variables...');
fs.writeFileSync(outputPath, configContent);
console.log('config.js generated successfully.');
