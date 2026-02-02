document.addEventListener("DOMContentLoaded", () => {
  const CONFIG = {
    apiUrl: "https://na13-discover-different-api.vercel.app/api/weather",
    storageKey: "nz_weather_cache",
    attrSelectors: {
      temp: "[data-temp]",
      wind: "[data-wind]",
    },
    regionKeyNormalizer: (raw) => {
      if (!raw) return "";
      return String(raw).trim().toLowerCase();
    },
    typeMap: {
      temp: "temperature",
      wind: "wind_speed",
    },
  };

  async function initWeather() {
    let weatherData = null;

    const cached = sessionStorage.getItem(CONFIG.storageKey);

    if (cached) {
      console.log("Weather: Loaded from Cache");
      try {
        weatherData = JSON.parse(cached);
      } catch (e) {
        console.warn("Weather: Cache parse failed, refetching...");
        sessionStorage.removeItem(CONFIG.storageKey);
      }
    }

    if (!weatherData) {
      console.log("Weather: Fetching from API...");
      try {
        const response = await fetch(CONFIG.apiUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Network response was not ok");
        weatherData = await response.json();
        sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(weatherData));
      } catch (error) {
        console.error("Weather: API Failed", error);
        return;
      }
    }

    updateWeatherUI(weatherData);
    startObserver(weatherData);
  }

  function getValueForRegion(data, regionKey, typeKey) {
    if (!data || !regionKey || !typeKey) return null;
    const regionData = data[regionKey];
    if (!regionData) return null;
    const value = regionData[typeKey];
    if (value === undefined || value === null) return null;
    return String(value);
  }

  function updateWeatherUI(data) {
    if (!data) return;

    const tempEls = document.querySelectorAll(CONFIG.attrSelectors.temp);
    tempEls.forEach((el) => {
      const regionKey = CONFIG.regionKeyNormalizer(
        el.getAttribute("data-temp")
      );
      const value = getValueForRegion(data, regionKey, CONFIG.typeMap.temp);
      if (value !== null && el.textContent !== value) el.textContent = value;
    });

    const windEls = document.querySelectorAll(CONFIG.attrSelectors.wind);
    windEls.forEach((el) => {
      const regionKey = CONFIG.regionKeyNormalizer(
        el.getAttribute("data-wind")
      );
      const value = getValueForRegion(data, regionKey, CONFIG.typeMap.wind);
      if (value !== null && el.textContent !== value) el.textContent = value;
    });
  }

  function startObserver(data) {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (
          m.type !== "childList" ||
          !m.addedNodes ||
          m.addedNodes.length === 0
        )
          continue;

        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j];
          if (!node || node.nodeType !== 1) continue;

          if (
            (node.matches &&
              (node.matches(CONFIG.attrSelectors.temp) ||
                node.matches(CONFIG.attrSelectors.wind))) ||
            (node.querySelector &&
              (node.querySelector(CONFIG.attrSelectors.temp) ||
                node.querySelector(CONFIG.attrSelectors.wind)))
          ) {
            shouldUpdate = true;
            break;
          }
        }

        if (shouldUpdate) break;
      }

      if (shouldUpdate) updateWeatherUI(data);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  initWeather();
});
