# Ink Weather Clock (Static + API Proxy)

This project is a web-based Weather Clock that uses QWeather (和风天气) API. It includes a serverless function proxy (`api/weather.js`) to securely handle API keys and JWT authentication without exposing them to the client.

## Project Structure

```
├── api/                  # Serverless Functions (Vercel)
│   └── weather.js        # Proxy handler (ESM)
├── js/                   # Client-side Logic & Assets
│   ├── config.js         # Generated configuration
│   ├── jose.min.js       # Local JWT library (ESM)
│   └── ...
├── scripts/              # Build utilities
│   └── build-config.js   # Generates js/config.js from Env Vars
├── public/               # Static Assets (optional standard folder behavior)
├── .env.example          # Template for Environment Variables
├── vercel.json           # Vercel Configuration
└── package.json          # Dependency & Script management
```

## Configuration

This project uses **Environment Variables** for configuration to support secure deployment and easy environments switching.

**DO NOT** modify `js/config.js` manually if you plan to use CI/CD (like Vercel), as it will be overwritten during build. Configuration is managed via Environment Variables.

### Required Environment Variables

See `.env.example` for a template.

**Local Development:**
Create a `.env` file (do not commit it) with your keys.

**Vercel Deployment:**
Add these variables in your Vercel Project Settings > Environment Variables.

**Authentication Variables (Choose One Mode):**

*Mode 1: API Key (Simpler)*
- `QWEATHER_KEY`: Your QWeather API Key.

*Mode 2: JWT (More Secure)*
- `QWEATHER_JWT_KEY`: Private Key content (PEM format).
- `QWEATHER_JWT_KID`: Key ID.
- `QWEATHER_JWT_SUB`: Project ID.

**Client Options:**
- `WEATHER_LOCATION`: Default Location ID (e.g., `101210101` for Hangzhou).
- `WEATHER_AUTH_MODE`: Set to `server` to use the proxy.
- `ASSETS_SOURCE`: `npm` or `local`.
- `CDN_BASE`: Custom CDN URL (e.g., `https://cdn.cbd.int`).
- `PACKAGE_NAME`: Package name on npm (e.g., `ink-weather-clock-static`).

## Deployment

### Vercel (Recommended)

1.  Connect your repository to Vercel.
2.  In **Build & Development Settings**, the Build Command `npm run build` will automatically run.
3.  Add the **Environment Variables** as listed above.
4.  Deploy.

### Troubleshooting

-   **API 500 Error**: Check Vercel Function Logs. Ensure `QWEATHER_KEY` or JWT variables are correctly set.
-   **Dependencies**: This project uses `type: module`. Ensure your Node version is modern (Vercel default is usually fine).
-   **CORS**: The API is designed for same-origin usage (embeds use `window.parent` logic or standard fetch).

## Local Development

```bash
# Install dependencies
npm install

# Build config (manual)
npm run build

# To test the API, strict local testing requires Vercel CLI or a Node wrapper
npx vercel dev
```
