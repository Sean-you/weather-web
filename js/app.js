
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

    function resolveIpToLocation(ip) {
        const key = Config.weather.key;
        // QWeather GeoAPI supports IP lookup
        const url = `https://geoapi.qweather.com/v2/city/lookup?location=${ip}&key=${key}`;

        var GeoReq = new XMLHttpRequest();
        GeoReq.open("GET", url, true);
        GeoReq.onreadystatechange = function () {
            if (GeoReq.readyState == 4) {
                if (GeoReq.status == 200) {
                    var data = JSON.parse(GeoReq.responseText);
                    if (data.code === '200' && data.location && data.location.length > 0) {
                        // Found location
                        const locationId = data.location[0].id; // Use City ID
                        fetchWeather(locationId);
                    } else {
                        console.warn('GeoAPI IP lookup failed', data.code);
                        fetchWeather(Config.weather.location); // Fallback
                    }
                } else {
                    fetchWeather(Config.weather.location); // Fallback
                }
            }
        };
        GeoReq.send();
    }

    function fetchWeather(loc) {
        if (!loc) {
            console.error("No location specified for weather.");
            return;
        }

        // Fetch City Info (Parallel)
        fetchCityInfo(loc);

        var NowWeather = new XMLHttpRequest();
        // Construct URL
        const key = Config.weather.key;
        const url = `https://devapi.qweather.com/v7/weather/now?location=${loc}&key=${key}`;

        NowWeather.open("GET", url, true);
        NowWeather.onreadystatechange = function () {
            if (NowWeather.readyState == 4 && NowWeather.status == 200) {
                var NowWeatherData = JSON.parse(NowWeather.responseText);
                if (NowWeatherData.code !== '200') {
                    console.error("Weather API Error:", NowWeatherData.code);
                    return;
                }

                // Update DOM
                // Use AssetBase for icons!
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
        };
        NowWeather.send();

        // Schedule next update (30 mins = 1800000ms)
        setTimeout(TodayWeather, 1800000);
    }

    function fetchCityInfo(loc) {
        const key = Config.weather.key;
        const url = `https://geoapi.qweather.com/v2/city/lookup?location=${loc}&key=${key}`;

        var CityReq = new XMLHttpRequest();
        CityReq.open("GET", url, true);
        CityReq.onreadystatechange = function () {
            if (CityReq.readyState == 4 && CityReq.status == 200) {
                var data = JSON.parse(CityReq.responseText);
                if (data.code === '200' && data.location && data.location.length > 0) {
                    var info = data.location[0];
                    var province = info.adm1; // e.g., "浙江省"
                    var city = info.name;     // e.g., "杭州"

                    // Optional: trim "省"/"市" if desired for cleaner look
                    // province = province.replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, ''); 
                    // city = city.replace(/市/g, '');

                    // Update DOM
                    // Check if elements exist (in case user removed them)
                    var elProv = document.getElementById("IdProvinces");
                    var elCity = document.getElementById("IdCity");
                    if (elProv) elProv.innerHTML = province;
                    if (elCity) elCity.innerHTML = city;
                }
            }
        };
        CityReq.send();
    }

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

    // Initialize
    window.InkWeatherApp = {
        init: function () {
            SolarLunarTime();
            TodayWeather();
            NowPoetry();
        }
    };

})(window);
