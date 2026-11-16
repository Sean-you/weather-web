/**
 * QWeather API 代理 — EdgeOne Pages Edge Function
 *
 * 路由：edge-functions/api/weather.js  →  /api/weather
 * 运行时：EdgeOne 边缘函数（V8，非 Node.js）
 *   - 不能用 Node 内置模块、不能用 npm 包
 *   - 不支持 Response.json()，必须 new Response(JSON.stringify(...))
 *   - CPU 时间上限 200ms/次（等待 fetch 的时间不计入 CPU）
 *
 * 与 Vercel 版（api/weather.js）的区别：
 *   - 去掉 jose / JWT 分支，只支持 API Key（V8 生态无 npm 依赖）
 *   - 环境变量从 context.env 读取，而非 process.env
 */

const DEFAULT_API_HOST = '******.re.qweatherapi.com';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export async function onRequest(context) {
  const { request } = context;
  const env = context.env || {};
  const url = new URL(request.url);

  const type = url.searchParams.get('type') || 'weather';
  const location = url.searchParams.get('location');

  if (!location) {
    return json({ error: 'Missing location parameter', code: '400' }, 400);
  }

  const host = String(env.QWEATHER_API_HOST || DEFAULT_API_HOST)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  // 专属 API Host 下 GeoAPI 路径为 /geo/v2/*，天气仍为 /v7/*
  const path = type === 'city' ? '/geo/v2/city/lookup' : '/v7/weather/now';

  const key = env.QWEATHER_KEY;
  if (!key) {
    console.error('[qweather] 缺少 QWEATHER_KEY 环境变量');
    return json(
      {
        error: 'Server configuration error: missing QWEATHER_KEY',
        hint: 'EdgeOne Pages 控制台 → 项目设置 → 环境变量',
      },
      500
    );
  }

  const target = new URL(`https://${host}${path}`);
  target.searchParams.set('location', String(location));
  target.searchParams.set('key', key);

  let resp;
  try {
    resp = await fetch(target.toString(), { headers: { Accept: 'application/json' } });
  } catch (e) {
    const msg = (e && e.message) || String(e);
    console.error('[qweather] 请求上游失败', msg);
    return json({ error: 'Upstream request failed', detail: msg }, 502);
  }

  const text = await resp.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error('[qweather] 上游返回非 JSON', resp.status, text.slice(0, 300));
    return json(
      {
        error: 'Upstream returned non-JSON',
        upstreamStatus: resp.status,
        snippet: text.slice(0, 200),
      },
      502
    );
  }

  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (resp.ok) {
    // 只缓存成功结果，避免把错误缓存住
    headers['Cache-Control'] = 'public, max-age=300';
  } else {
    console.error('[qweather] 上游报错', resp.status, text.slice(0, 300));
  }

  return new Response(JSON.stringify(body), { status: resp.status, headers });
}
