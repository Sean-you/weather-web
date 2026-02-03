const https = require('https');
const { SignJWT, importPKCS8 } = require('jose');

// Cache token in memory (lambda container reuse)
let _cachedToken = null;
let _tokenExp = 0;

async function getQWeatherToken() {
    // 1. JWT Mode
    // 1. JWT Mode
    let rawKey = process.env.QWEATHER_JWT_KEY || '';
    // Auto-wrap if only base64 content is provided
    if (rawKey && !rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
        rawKey = `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;
    }
    const privateKey = rawKey.replace(/\\n/g, '\n');
    const kid = process.env.QWEATHER_JWT_KID;
    const sub = process.env.QWEATHER_JWT_SUB;

    if (privateKey && kid && sub) {
        const now = Math.floor(Date.now() / 1000);
        if (_cachedToken && now < _tokenExp - 60) {
            return _cachedToken;
        }

        try {
            const alg = 'EdDSA';
            const pkcs8 = await importPKCS8(privateKey, alg);
            const iat = now - 30;
            const exp = iat + 900;

            const token = await new SignJWT({})
                .setProtectedHeader({ alg, kid })
                .setSubject(sub)
                .setIssuedAt(iat)
                .setExpirationTime(exp)
                .sign(pkcs8);

            _cachedToken = token;
            _tokenExp = exp;
            return token;
        } catch (e) {
            console.error("JWT Error", e);
            throw e;
        }
    }
    return null;
}

export default async function handler(req, res) {
    // 1. Parse params
    const { type, location } = req.query; // type: 'weather' or 'city'

    if (!location) {
        return res.status(400).json({ code: '400', message: 'Missing location' });
    }

    // 2. Determine target URL
    let targetUrl = '';
    if (type === 'city') {
        targetUrl = `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(location)}`;
    } else {
        // default weather
        targetUrl = `https://devapi.qweather.com/v7/weather/now?location=${encodeURIComponent(location)}`;
    }

    // 3. Add Auth (Server-side)
    const token = await getQWeatherToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    } else {
        // Fallback to Key
        const key = process.env.QWEATHER_KEY;
        if (key) {
            targetUrl += `&key=${key}`;
        } else {
            return res.status(500).json({ code: '500', message: 'No Server Auth Configured' });
        }
    }

    // 4. Proxy Request
    const proxyReq = https.get(targetUrl, { headers }, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode).json(JSON.parse(data));
        });
    });

    proxyReq.on('error', (e) => {
        res.status(500).json({ code: '500', message: e.message });
    });
}
