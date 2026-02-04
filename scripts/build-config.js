import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
// SECURITY: DO NOT read sensitive keys here. 
// Vercel build runs in the same env as runtime, so we must be careful NOT to inject secrets into client-side config.js.
// Since we are using authMode: 'server', keys are read by api/weather.js at runtime.

const location = process.env.WEATHER_LOCATION || '101210101';
// Default to 'server' mode for Vercel builds if not specified
const authMode = process.env.WEATHER_AUTH_MODE || 'server';

// Defaults
let assetsSource = process.env.ASSETS_SOURCE || 'local';
let cdnBase = process.env.CDN_BASE || 'https://cdn.jsdelivr.net/npm';
let packageName = process.env.PACKAGE_NAME || 'ink-weather-clock';
let version = process.env.VERSION || 'latest';

// Try to read existing config.js to preserve user settings
const currentConfigPath = path.join(__dirname, '..', 'js', 'config.js');
if (fs.existsSync(currentConfigPath)) {
    try {
        const currentContent = fs.readFileSync(currentConfigPath, 'utf8');

        // Extract assets config using Regex
        const sourceMatch = currentContent.match(/source:\s*['"]([^'"]+)['"]/);
        const cdnMatch = currentContent.match(/cdnBase:\s*['"]([^'"]+)['"]/);
        const pkgMatch = currentContent.match(/packageName:\s*['"]([^'"]+)['"]/);
        const verMatch = currentContent.match(/version:\s*['"]([^'"]+)['"]/);

        if (sourceMatch) assetsSource = process.env.ASSETS_SOURCE || sourceMatch[1];
        if (cdnMatch) cdnBase = process.env.CDN_BASE || cdnMatch[1];
        if (pkgMatch) packageName = process.env.PACKAGE_NAME || pkgMatch[1];
        if (verMatch) version = process.env.VERSION || verMatch[1];

        console.log('Preserved config from js/config.js:', { assetsSource, cdnBase, packageName, version });
    } catch (e) {
        console.warn('Failed to read existing config.js, using defaults.', e);
    }
}

const configContent = `window.InkWeatherConfig = {
    assets: {
        source: '${assetsSource}', 
        cdnBase: '${cdnBase}',
        packageName: '${packageName}',
        version: '${version}'
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
const outputPath = path.join(__dirname, '..', 'js', 'config.js');

console.log('Generating config.js from environment variables...');
fs.writeFileSync(outputPath, configContent);
console.log('config.js generated successfully.');
