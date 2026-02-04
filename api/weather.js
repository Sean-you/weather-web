import https from 'https';
import { createGunzip } from 'zlib';
import { SignJWT, importPKCS8 } from 'jose';

// Cache token in memory (lambda container reuse)
let _cachedToken = null;
let _tokenExp = 0;

async function getQWeatherToken() {
    // 1. JWT Mode
    let rawKey = process.env.QWEATHER_JWT_KEY || '';
    // Auto-wrap if only base64 content is provided and headers are missing
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
            console.error("JWT Error:", e.message);
            // Don't throw, return null to fallback or fail gracefully later
            return null;
        }
    }
    return null;
}

export default async function handler(req, res) {
    try {
        // 1. Parse params
        const { type, location } = req.query; // type: 'weather' or 'city'

        if (!location) {
            return res.status(400).json({ code: '400', message: 'Missing location parameter' });
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
                console.error("Missing QWEATHER_KEY or QWEATHER_JWT_* env vars");
                return res.status(500).json({
                    code: '500',
                    message: 'Server Configuration Error: Missing QWeather Credentials (KEY or JWT)'
                });
            }
        }

        // 4. Proxy Request with timeout and error handling

        const proxyReq = https.get(targetUrl, { headers, timeout: 5000 }, (proxyRes) => {
            let stream = proxyRes;

            // Handle Gzip compression if present
            if (proxyRes.headers['content-encoding'] === 'gzip') {
                const gunzip = createGunzip();
                proxyRes.pipe(gunzip);
                stream = gunzip;
            }

            let data = [];
            stream.on('data', chunk => data.push(chunk));
            stream.on('end', () => {
                const buffer = Buffer.concat(data);
                const text = buffer.toString();
                try {
                    const jsonData = JSON.parse(text);
                    res.status(proxyRes.statusCode || 200).json(jsonData);
                } catch (e) {
                    console.error("Upstream API Parse Error:", text);
                    res.status(502).json({
                        code: '502',
                        message: 'Upstream API returned invalid JSON',
                        upstreamStatus: proxyRes.statusCode,
                        raw: text.substring(0, 100)
                    });
                }
            });
            stream.on('error', (e) => {
                console.error("Stream Error:", e);
                res.status(500).json({ code: '500', message: 'Response processing failed' });
            });
        });

        proxyReq.on('error', (e) => {
            console.error("Upstream Request Error:", e.message);
            res.status(502).json({ code: '502', message: 'Failed to contact Weather API', error: e.message });
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.status(504).json({ code: '504', message: 'Upstream API Timeout' });
        });

    } catch (err) {
        console.error("Handler Exception:", err);
        res.status(500).json({ code: '500', message: 'Internal Server Error' });
    }
}
