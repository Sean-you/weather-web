(function () {
    var config = window.InkWeatherConfig;
    if (!config) {
        console.error("InkWeatherConfig not found. Please load config.js first.");
        return;
    }

    var assets = config.assets || {};
    var assetBase = '';

    if (assets.source === 'npm') {
        var cdn = assets.cdnBase || 'https://cdn.jsdelivr.net/npm';
        var pkg = assets.packageName || 'ink-weather-clock';
        var ver = assets.version || 'latest';
        // Handle unpkg vs jsdelivr differences if needed, but standard format usually works
        // jsdelivr: https://cdn.jsdelivr.net/npm/package@version
        // unpkg: https://unpkg.com/package@version

        // Remove trailing slash from cdn if present
        if (cdn.endsWith('/')) cdn = cdn.slice(0, -1);

        assetBase = cdn + '/' + pkg;
        assetBase += '@' + ver;
    } else {
        // Local mode
        // Assuming loader.js is in js/ folder, we want the root relative to index.html
        // If index.html includes js/loader.js, then '.' is the root (relative to index.html location)
        assetBase = '.';
    }

    // Expose assetBase for app.js
    if (!config.runtime) config.runtime = {};
    config.runtime.assetBase = assetBase;

    console.log("InkWeather loading assets from:", assetBase);

    function loadCSS(url) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }

    function loadScript(url, callback) {
        var script = document.createElement('script');
        script.src = url;
        script.onload = callback;
        script.onerror = function () {
            console.error("Failed to load script:", url);
        };
        document.body.appendChild(script);
    }

    // 1. Load CSS
    loadCSS(assetBase + '/css/style.css');

    // 2. Load dependencies
    // jose is now loaded dynamically in app.js via ESM import

    // Load date.js
    loadScript(assetBase + '/js/date.js', function () {
        // 3. Load Main App Logic
        loadScript(assetBase + '/js/app.js', function () {
            // 4. Initialize
            if (window.InkWeatherApp && window.InkWeatherApp.init) {
                window.InkWeatherApp.init();
            }
        });
    });

})();
