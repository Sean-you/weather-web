
// Main Application Logic
(function (window) {
    const Config = window.InkWeatherConfig;
    // Runtime config set by loader.js
    const AssetBase = (Config.runtime && Config.runtime.assetBase) || '';

    // 时间部分
    function SolarLunarTime() {
        var NowDateStamp = new Date().getTime();
        var JudgmentUTC = new Date().getTimezoneOffset();
        var NowDate = new Date();

        // Simple TZ fix from original code (though might not be perfect for everyone, keeping original logic prefers)
        switch (JudgmentUTC) {
            case 0: NowDate = new Date(NowDateStamp + 28800000); break;
            case -480: NowDate = new Date(NowDateStamp); break;
            default: NowDate = new Date(NowDateStamp); // Default fallback
        }

        // Solar & Week
        if (typeof Solar === 'undefined' || typeof Lunar === 'undefined') {
            console.error("Date library not loaded");
            return;
        }

        var SolarDate = Solar.fromDate(NowDate);
        document.getElementById("IdSolarDateWeek").innerHTML =
            ((SolarDate.getYear()) + "年" + (SolarDate.getMonth() > 9 ? SolarDate.getMonth() : "0" + SolarDate.getMonth()) + "月" + (SolarDate.getDay() > 9 ? SolarDate.getDay() : "0" + SolarDate.getDay()) + "日 • 星期" + (SolarDate.getWeekInChinese()));

        // Lunar
        var LunarDate = Lunar.fromDate(NowDate);
        document.getElementById("IdLunarDate").innerHTML =
            LunarDate.getYearInGanZhi() + " • " + LunarDate.getYearShengXiao() + "年 • " + LunarDate.getMonthInChinese() + "月" + LunarDate.getDayInChinese();

        // Time
        var Hours = (NowDate.getHours()) > 9 ? (NowDate.getHours()) : "0" + (NowDate.getHours());
        var Minutes = (NowDate.getMinutes()) > 9 ? (NowDate.getMinutes()) : "0" + (NowDate.getMinutes());
        // Seconds unused in display usually but variable was there

        document.getElementById("IdTime").innerHTML = Hours + ":" + Minutes;

        setTimeout(SolarLunarTime, 500);
    }

    // 天气部分
    function TodayWeather() {
        // Determine location
        let mode = Config.weather.mode; // 'manual', 'geoapi', 'auto_ip'
        let location = Config.weather.location;

        if (mode === 'geoapi') {
            // Priority 1: Browser Geolocation (async)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude.toFixed(2);
                        const lon = position.coords.longitude.toFixed(2);
                        fetchWeather(`${lon},${lat}`);
                    },
                    (error) => {
                        console.warn('Geolocation failed, falling back to manual location', error);
                        fetchWeather(location);
                    }
                );
                return;
            }
        }
        else if (mode === 'auto_ip') {
            // Priority 2: Auto IP (No popup)

            // Helper to try fetching IP from a source
            const fetchIp = (url, parseFn, fallbackFn) => {
                var IpReq = new XMLHttpRequest();
                IpReq.open("GET", url, true);
                IpReq.onreadystatechange = function () {
                    if (IpReq.readyState == 4) {
                        if (IpReq.status == 200) {
                            try {
                                var ip = parseFn(IpReq.responseText);
                                if (ip) {
                                    console.log("Got IP:", ip);
                                    resolveIpToLocation(ip);
                                } else {
                                    fallbackFn();
                                }
                            } catch (e) {
                                console.warn("IP Parse Error", e);
                                fallbackFn();
                            }
                        } else {
                            console.warn('IP Fetch failed', url, IpReq.status);
                            fallbackFn();
                        }
                    }
                };
                IpReq.onerror = function () {
                    console.warn('IP Network Error', url);
                    fallbackFn();
                };
                IpReq.send();
            };

            // 1. Primary: UAPIs (User Requested)
            fetchIp(
                "https://uapis.cn/api/v1/network/myip?source=commercial",
                (text) => {
                    try {
                        var res = JSON.parse(text);
                        // Prioritize coordinates for better accuracy (addresses IP mismatch)
                        if (res && res.longitude && res.latitude) {
                            return res.longitude + "," + res.latitude;
                        }
                        if (res && res.ip) return res.ip;
                    } catch (e) { }
                    return null;
                },
                () => {
                    console.warn("IP method failed, using manual location.");
                    fetchWeather(location);
                }
            );

            return;
        }

        // Manual mode or fallback
        fetchWeather(location);
    }

    // Token Cache
    let _cachedToken = null;
    let _tokenExp = 0;

    async function getQWeatherToken() {
        // Fallback to API Key mode if configured
        if (Config.weather.authMode !== 'jwt') {
            return null; // Signals to use Key
        }

        const jwtCfg = Config.weather.jwt;
        if (!jwtCfg || !jwtCfg.privateKey || !jwtCfg.kid || !jwtCfg.sub) {
            console.error("JWT Configuration incomplete");
            return null;
        }

        // Return cached if valid (expires in 15 mins, we refresh if < 1 min left)
        const now = Math.floor(Date.now() / 1000);
        if (_cachedToken && now < _tokenExp - 60) {
            return _cachedToken;
        }

        try {
            // Using 'jose' library loaded in loader.js
            const { SignJWT, importPKCS8 } = window.jose;

            const alg = 'EdDSA';
            const pkcs8 = await importPKCS8(jwtCfg.privateKey, alg);

            const iat = now - 30; // 30s drift allowance
            const exp = iat + 900; // 15 mins

            _cachedToken = await new SignJWT({})
                .setProtectedHeader({ alg, kid: jwtCfg.kid })
                .setIssuer(jwtCfg.sub) // Some examples use sub as issuer or subject, docs say 'sub' in payload is ProjectID.
                // Re-reading docs: 
                // Payload: { sub: PROJECT_ID, iat, exp }
                // Header: { kid: KEY_ID }
                // Wait, docs example for Node says: customPayload = { sub: 'YOUR_PROJECT_ID' ... }
                // So 'sub' claim is Project ID.
                .setSubject(jwtCfg.sub)
                .setIssuedAt(iat)
                .setExpirationTime(exp)
                .sign(pkcs8);

            _tokenExp = exp;
            console.log("Registered new Weather Token");
            return _cachedToken;

        } catch (e) {
            console.error("JWT Generation Failed", e);
            return null;
        }
    }

    async function sendWeatherRequest(urlBase, paramsObj, onSuccess) {
        // 1. Get Token
        const token = await getQWeatherToken();

        let url = urlBase;
        // 2. Build URL or Headers
        const queryString = Object.keys(paramsObj)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(paramsObj[k]))
            .join('&');

        let headers = {};

        if (Config.weather.authMode === 'server') {
            // Server Proxy Mode
            // Redirect request to /api/weather
            // Determine type based on urlBase
            let type = 'weather';
            if (urlBase.includes('city/lookup')) type = 'city';

            // Construct proxy URL
            // Current page is origin, so just /api/weather
            url = '/api/weather?type=' + type;
            if (queryString) url += '&' + queryString;

        } else if (token) {
            // JWT Mode: Header Authorization
            headers['Authorization'] = 'Bearer ' + token;
            // params don't need 'key'
            if (queryString) url += '?' + queryString;
        } else {
            // API Key Mode: Add key to params
            let fullParams = queryString;
            if (Config.weather.key) {
                fullParams += '&key=' + Config.weather.key;
            }
            if (fullParams) url += '?' + fullParams;
        }

        // 3. Send
        var req = new XMLHttpRequest();
        req.open("GET", url, true);

        // Add headers
        for (let h in headers) {
            req.setRequestHeader(h, headers[h]);
        }

        req.onreadystatechange = function () {
            if (req.readyState == 4) {
                // Pass full req to callback to handle status checking
                onSuccess(req);
            }
        };
        req.send();
    }

    function resolveIpToLocation(ip) {
        const url = `https://geoapi.qweather.com/v2/city/lookup`;
        sendWeatherRequest(url, { location: ip }, function (req) {
            if (req.status == 200) {
                var data = JSON.parse(req.responseText);
                if (data.code === '200' && data.location && data.location.length > 0) {
                    const locationId = data.location[0].id;
                    fetchWeather(locationId);
                } else {
                    console.warn('GeoAPI IP lookup failed', data.code);
                    fetchWeather(Config.weather.location);
                }
            } else {
                fetchWeather(Config.weather.location);
            }
        });
    }

    function fetchCityInfo(loc) {
        const url = `https://geoapi.qweather.com/v2/city/lookup`;
        sendWeatherRequest(url, { location: loc }, function (req) {
            if (req.status == 200) {
                var data = JSON.parse(req.responseText);
                if (data.code === '200' && data.location && data.location.length > 0) {
                    var info = data.location[0];
                    var province = info.adm1;
                    var city = info.name;
                    var elProv = document.getElementById("IdProvinces");
                    var elCity = document.getElementById("IdCity");
                    if (elProv) elProv.innerHTML = province;
                    if (elCity) elCity.innerHTML = city;
                }
            }
        });
    }

    function fetchWeather(loc) {
        if (!loc) {
            console.error("No location specified for weather.");
            return;
        }

        // Fetch City Info (Parallel)
        fetchCityInfo(loc);

        const url = `https://devapi.qweather.com/v7/weather/now`;
        sendWeatherRequest(url, { location: loc }, function (req) {
            if (req.status == 200) {
                var NowWeatherData = JSON.parse(req.responseText);
                if (NowWeatherData.code !== '200') {
                    console.error("Weather API Error:", NowWeatherData.code);
                    return;
                }

                var iconPath = AssetBase + '/icons/' + NowWeatherData.now.icon + '.svg';
                document.getElementById("IdIcon").src = iconPath;
                document.getElementById("IdText").innerHTML = NowWeatherData.now.text;
                document.getElementById("IdTemp").innerHTML = NowWeatherData.now.temp + '°';
                document.getElementById("IdWind").innerHTML = NowWeatherData.now.windDir + '•' + NowWeatherData.now.windSpeed + 'km/h';
                document.getElementById("IdFeelsLike").innerHTML = NowWeatherData.now.feelsLike + '°';
                document.getElementById("IdHumidity").innerHTML = NowWeatherData.now.humidity + '%';
                document.getElementById("IdWindScale").innerHTML = NowWeatherData.now.windScale + '级';
                document.getElementById("IdPressure").innerHTML = NowWeatherData.now.pressure + 'Hpa';
            }
        });

        setTimeout(TodayWeather, 1800000);
    }

    // ... Existing Poetry code ...
    // 名言部分
    function NowPoetry() {
        var Poetry = new XMLHttpRequest();
        Poetry.open("GET", "https://v1.hitokoto.cn/", true);
        Poetry.onreadystatechange = function () {
            if (Poetry.readyState == 4 && Poetry.status == 200) {
                var PoetryDate = JSON.parse(Poetry.responseText);
                document.getElementById("IdNowPoetry").innerHTML = "∮ " + PoetryDate.hitokoto;
            }
        }
        Poetry.send();
        setTimeout(NowPoetry, 1800000);
    }

    window.InkWeatherApp = {
        init: function () {
            SolarLunarTime();
            TodayWeather();
            NowPoetry();
        }
    };

})(window);
