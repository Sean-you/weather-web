/**
 * QWeather API 代理 — Vercel Serverless Function
 *
 * 2026-11-16 修复说明：
 *  1. 旧公共域名已停服：devapi.qweather.com / api.qweather.com 返回 403 Invalid Host，
 *     geoapi.qweather.com/v2/* 返回 404。必须改用账号「专属 API Host」。
 *  2. GeoAPI 路径变更：/v2/city/lookup → /geo/v2/city/lookup（旧路径在专属 Host 下 404）。
 *  3. 用全局 fetch 取代手写 https + 手动 gunzip：自动处理 gzip/br/deflate，
 *     避免上游换了压缩方式就解析失败、并以 502 返回的问题。
 *  4. jose 改为按需动态 import：只在 JWT 模式下加载，API Key 模式下完全不碰这个依赖，
 *     消除因依赖/Node 版本导致的函数启动失败。
 *  5. 上游错误原样透传（含 upstreamStatus），不再用裸 502 掩盖真实原因。
 */

const DEFAULT_API_HOST = 'm733jtebn6.re.qweatherapi.com'; // 兜底，建议用环境变量覆盖
const TIMEOUT_MS = 8000;

// JWT token 缓存（同一 lambda 实例复用）
let _token = null;
let _tokenExp = 0;

function getApiHost() {
  const raw = process.env.QWEATHER_API_HOST || DEFAULT_API_HOST;
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

async function getJwtToken() {
  const rawKey = process.env.QWEATHER_JWT_KEY || '';
  const kid = process.env.QWEATHER_JWT_KID;
  const sub = process.env.QWEATHER_JWT_SUB;
  if (!rawKey || !kid || !sub) return null;

  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExp - 60) return _token;

  try {
    const { SignJWT, importPKCS8 } = await import('jose');
    let pem = rawKey.replace(/\\n/g, '\n');
    if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
      pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
    }
    const pkcs8 = await importPKCS8(pem, 'EdDSA');
    const iat = now - 30;
    const exp = iat + 900;
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setSubject(sub)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(pkcs8);
    _token = token;
    _tokenExp = exp;
    return token;
  } catch (e) {
    console.error('[qweather] JWT 签名失败:', e?.message || e);
    return null;
  }
}

export default async function handler(req, res) {
  const { type, location } = req.query || {};

  if (!location) {
    return res.status(400).json({ error: 'Missing location parameter', code: '400' });
  }

  const host = getApiHost();
  const isCity = type === 'city';
  const path = isCity ? '/geo/v2/city/lookup' : '/v7/weather/now';

  const qs = new URLSearchParams({ location: String(location) });

  const token = await getJwtToken();
  const headers = { Accept: 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const key = process.env.QWEATHER_KEY;
    if (!key) {
      console.error('[qweather] 缺少 QWEATHER_KEY / QWEATHER_JWT_* 环境变量');
      return res.status(500).json({
        error: 'Server configuration error: missing QWEATHER_KEY or QWEATHER_JWT_*',
        hint: 'Vercel → Settings → Environment Variables 配置 QWEATHER_KEY，并 Redeploy',
      });
    }
    qs.set('key', key);
  }

  const url = `https://${host}${path}?${qs.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, { headers, signal: controller.signal });
    const text = await upstream.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[qweather] 上游返回非 JSON:', upstream.status, text.slice(0, 300));
      return res.status(502).json({
        error: 'Upstream returned non-JSON',
        upstreamStatus: upstream.status,
        snippet: text.slice(0, 200),
      });
    }

    if (upstream.ok) {
      // 只缓存成功结果，避免把 401/403 缓存住
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=120');
    } else {
      console.error('[qweather] 上游报错:', upstream.status, text.slice(0, 300));
    }

    return res.status(upstream.status).json(json);
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    console.error('[qweather] 请求上游失败:', e?.message || e);
    return res.status(aborted ? 504 : 502).json({
      error: aborted ? 'Upstream timeout' : 'Upstream request failed',
      detail: e?.message || String(e),
    });
  } finally {
    clearTimeout(timer);
  }
}

export const config = { maxDuration: 10 };
