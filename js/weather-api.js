(function() {
  'use strict';

  const API_KEY = '6747c1afc1e12761e9a829356066057c';
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';

  const RESORTS = [
    {
      id: 'kr-poliana',
      name: 'Красная Поляна',
      name_en: 'Krasnaya Polyana',
      lat: 43.6775,
      lon: 40.2058,
      altitude: 540
    },
    {
      id: 'sheregesh',
      name: 'Шерегеш',
      name_en: 'Sheregesh',
      lat: 52.9197,
      lon: 87.9939,
      altitude: 1270
    },
    {
      id: 'elbrus',
      name: 'Эльбрус',
      name_en: 'Elbrus',
      lat: 43.2567,
      lon: 42.5247,
      altitude: 2350
    },
    {
      id: 'dombai',
      name: 'Домбай',
      name_en: 'Dombay',
      lat: 43.2922,
      lon: 41.6239,
      altitude: 1600
    },
    {
      id: 'arkhyz',
      name: 'Архыз',
      name_en: 'Arkhyz',
      lat: 43.5656,
      lon: 41.2769,
      altitude: 1450
    }
  ];

  const WeatherAPI = {
    async fetchCurrent(lat, lon) {
      const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    },

    async fetchForecast(lat, lon) {
      const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru&cnt=24`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    },

    groupByDay(list) {
      const days = {};
      list.forEach(item => {
        const d = new Date(item.dt * 1000);
        const key = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        if (!days[key]) days[key] = [];
        days[key].push(item);
      });
      return days;
    },

    dayAvg(items) {
      const temps = items.map(i => i.main.temp);
      return {
        temp_min: Math.min(...items.map(i => i.main.temp_min)),
        temp_max: Math.max(...items.map(i => i.main.temp_max)),
        temp_avg: temps.reduce((a, b) => a + b, 0) / temps.length,
        description: items[Math.floor(items.length / 2)].weather[0].description,
        icon: items[Math.floor(items.length / 2)].weather[0].icon,
        wind_max: Math.max(...items.map(i => i.wind.speed)),
        pop: Math.round(Math.max(...items.map(i => i.pop)) * 100)
      };
    },

    async loadAll() {
      const results = [];
      for (const resort of RESORTS) {
        try {
          const [current, forecastRaw] = await Promise.all([
            this.fetchCurrent(resort.lat, resort.lon),
            this.fetchForecast(resort.lat, resort.lon)
          ]);
          const grouped = this.groupByDay(forecastRaw.list);
          const days = [];
          for (const [date, items] of Object.entries(grouped)) {
            days.push({ date, ...this.dayAvg(items) });
          }
          results.push({ ...resort, current, days });
        } catch (err) {
          console.warn(`Weather fetch failed for ${resort.name}:`, err);
          results.push({ ...resort, error: true, current: null, days: [] });
        }
      }
      return results;
    }
  };

  function getWindDirection(deg) {
    const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function getWeatherIcon(icon) {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  }

  function renderLiveWeather(data) {
    const container = document.getElementById('liveWeatherContainer');
    if (!container) return;
    container.innerHTML = '';

    const lang = window.I18nManager?.currentLang || 'ru';
    const isRu = lang === 'ru';

    data.forEach(resort => {
      const card = document.createElement('div');
      card.className = 'weather-card animate-on-scroll';

      if (resort.error || !resort.current) {
        card.innerHTML = `
          <div class="weather-card-header">
            <h3>${resort.name}</h3>
          </div>
          <div class="weather-card-body" style="text-align:center;padding:1rem;color:var(--text-muted);">
            ${isRu ? 'Нет данных о погоде' : 'No weather data'}
          </div>`;
        container.appendChild(card);
        return;
      }

      const c = resort.current;
      const temp = Math.round(c.main.temp);
      const feels = Math.round(c.main.feels_like);
      const windDir = getWindDirection(c.wind.deg);
      const forecast = resort.days.slice(0, 3);

      card.innerHTML = `
        <div class="weather-card-header">
          <h3>${resort.name}</h3>
          <span class="weather-altitude">${resort.altitude} м</span>
        </div>
        <div class="weather-card-body">
          <div class="weather-current">
            <div class="weather-temp-block">
              <img src="${getWeatherIcon(c.weather[0].icon)}" alt="${c.weather[0].description}" class="weather-icon">
              <span class="weather-temp">${temp > 0 ? '+' : ''}${temp}°</span>
              <span class="weather-desc">${c.weather[0].description}</span>
            </div>
            <div class="weather-details">
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Ощущается' : 'Feels like'}</span>
                <span class="detail-value">${feels > 0 ? '+' : ''}${feels}°</span>
              </div>
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Ветер' : 'Wind'}</span>
                <span class="detail-value">${Math.round(c.wind.speed)} м/с ${windDir}</span>
              </div>
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Влажность' : 'Humidity'}</span>
                <span class="detail-value">${c.main.humidity}%</span>
              </div>
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Облачность' : 'Clouds'}</span>
                <span class="detail-value">${c.clouds.all}%</span>
              </div>
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Давление' : 'Pressure'}</span>
                <span class="detail-value">${c.main.pressure} гПа</span>
              </div>
              <div class="weather-detail">
                <span class="detail-label">${isRu ? 'Видимость' : 'Visibility'}</span>
                <span class="detail-value">${(c.visibility / 1000).toFixed(1)} км</span>
              </div>
            </div>
          </div>
          <div class="weather-forecast">
            <h4>${isRu ? 'Прогноз на 3 дня' : '3-Day Forecast'}</h4>
            <div class="forecast-grid">
              ${forecast.map(d => `
                <div class="forecast-day">
                  <div class="forecast-date">${d.date}</div>
                  <img src="${getWeatherIcon(d.icon)}" alt="${d.description}" class="forecast-icon">
                  <div class="forecast-temps">
                    <span class="forecast-max">${Math.round(d.temp_max) > 0 ? '+' : ''}${Math.round(d.temp_max)}°</span>
                    <span class="forecast-min">${Math.round(d.temp_min) > 0 ? '+' : ''}${Math.round(d.temp_min)}°</span>
                  </div>
                  <div class="forecast-desc">${d.description}</div>
                  <div class="forecast-meta">${isRu ? 'ветер' : 'wind'} ${Math.round(d.wind_max)} м/с · ${isRu ? 'дождь' : 'rain'} ${d.pop}%</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    if (window.initScrollAnimations) window.initScrollAnimations();
  }

  async function initLiveWeather() {
    if (API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
      const el = document.getElementById('liveWeatherContainer');
      if (el) {
        el.innerHTML = `<div class="weather-card" style="text-align:center;padding:2rem;color:var(--text-muted);">
          ⚠ ${window.I18nManager?.currentLang === 'ru' ? 'API-ключ OpenWeatherMap не настроен' : 'OpenWeatherMap API key not configured'}<br>
          <small>${window.I18nManager?.currentLang === 'ru' ? 'Добавьте ключ в js/weather-api.js' : 'Add your API key to js/weather-api.js'}</small>
        </div>`;
      }
      return;
    }
    try {
      const data = await WeatherAPI.loadAll();
      renderLiveWeather(data);
    } catch (err) {
      console.error('Live weather failed:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('liveWeatherContainer')) {
      initLiveWeather();
    }
  });
})();
