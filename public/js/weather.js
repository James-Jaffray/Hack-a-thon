import { getMe } from './api.js';

let latitude = 0;
let longitude = 0;


export function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

export function getLat() {
    return latitude;
}

function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
}

function error() {
    alert("Sorry, no position available.");
}

const parseBool = (str) => typeof str === 'string' && str.trim().toLowerCase() === 'true';
const calcF = (celcius) => (celcius * (9/5)) + 32;
const calcK = (celcius) => celcius + 273.15;

// What to show is a hub setting chosen by the owner (see dashboard.js). On unless switched off.
/* this aint grabbing the values correctly & should probably be in an async function to work to, but that would require the variables to be called before hand too
const settings = (await getMe()).data?.settings ?? {};
const getTempToggle = settings.isTempToggled !== false;
const getFeelsLikeToggle = settings.isFeelsLikeToggled !== false;
const getConditionToggle = settings.isConditionToggled !== false;
const getHumidityToggle = settings.isHumidityToggled !== false;
*/

const getTempToggle = parseBool(localStorage.getItem('isTempToggled'));
const getFeelsLikeToggle = parseBool(localStorage.getItem('isFeelsLikeToggled'));
const getConditionToggle = parseBool(localStorage.getItem('isConditionToggled'));
const getHumidityToggle = parseBool(localStorage.getItem('isHumidityToggled'));
const getWindToggle = parseBool(localStorage.getItem('isWindToggled'));
const getForecastBtnToggle = parseBool(localStorage.getItem('isForecastBtnToggled'));
const getWeatherIconToggle = parseBool(localStorage.getItem('isWeatherIconToggled'));
const getTempUnit = localStorage.getItem('tempatureUnit');
const getTempRoundToggle = parseBool(localStorage.getItem('isDecInTempToggled'));
const getWindSpeedUnit = localStorage.getItem('windSpeedUnit');
const getPrecipUnit = localStorage.getItem('precipUnit');


const WEATHER_CODES = {
  0: { day: 'clear-day', night: 'clear-night', label: 'Clear sky' },
  1: { day: 'partly-cloudy-day', night: 'partly-cloudy-night', label: 'Mainly clear' },
  2: { day: 'partly-cloudy-day', night: 'partly-cloudy-night', label: 'Partly cloudy' },
  3: { day: 'overcast-day', night: 'overcast-night', label: 'Overcast' },
  45: { day: 'fog-day', night: 'fog-night', label: 'Fog' },
  48: { day: 'fog-day', night: 'fog-night', label: 'Depositing rime fog' },
  51: { day: 'partly-cloudy-day-drizzle', night: 'partly-cloudy-night-drizzle', label: 'Light drizzle' },
  53: { day: 'drizzle', night: 'drizzle', label: 'Moderate drizzle' },
  55: { day: 'extreme-drizzle', night: 'extreme-drizzle', label: 'Dense drizzle' },
  56: { day: 'partly-cloudy-day-sleet', night: 'partly-cloudy-night-sleet', label: 'Light freezing drizzle' },
  57: { day: 'sleet', night: 'sleet', label: 'Dense freezing drizzle' },
  61: { day: 'partly-cloudy-day-rain', night: 'partly-cloudy-night-rain', label: 'Slight rain' },
  63: { day: 'rain', night: 'rain', label: 'Moderate rain' },
  65: { day: 'extreme-rain', night: 'extreme-rain', label: 'Heavy rain' },
  66: { day: 'partly-cloudy-day-sleet', night: 'partly-cloudy-night-sleet', label: 'Light freezing rain' },
  67: { day: 'sleet', night: 'sleet', label: 'Heavy freezing rain' },
  71: { day: 'partly-cloudy-day-snow', night: 'partly-cloudy-night-snow', label: 'Slight snow fall' },
  73: { day: 'snow', night: 'snow', label: 'Moderate snow fall' },
  75: { day: 'extreme-snow', night: 'extreme-snow', label: 'Heavy snow fall' },
  77: { day: 'snowflake', night: 'snowflake', label: 'Snow grains' },
  80: { day: 'partly-cloudy-day-rain', night: 'partly-cloudy-night-rain', label: 'Slight rain showers' },
  81: { day: 'rain', night: 'rain', label: 'Moderate rain showers' },
  82: { day: 'extreme-rain', night: 'extreme-rain', label: 'Violent rain showers' },
  85: { day: 'partly-cloudy-day-snow', night: 'partly-cloudy-night-snow', label: 'Slight snow showers' },
  86: { day: 'extreme-snow', night: 'extreme-snow', label: 'Heavy snow showers' },
  95: { day: 'thunderstorms-day', night: 'thunderstorms-night', label: 'Thunderstorm' },
  96: { day: 'thunderstorms-day-rain', night: 'thunderstorms-night-rain', label: 'Thunderstorm with slight hail' },
  99: { day: 'thunderstorms-day-extreme-rain', night: 'thunderstorms-night-extreme-rain', label: 'Thunderstorm with heavy hail' }
};

export async function getCurrentWeather(latitude, longitude) {
    const cacheKey = `weather:${latitude},${longitude}`;
    let data;
    const cached = sessionStorage.getItem(cacheKey);
    let baseUrl;
    let params;
    if (cached && Date.now() - JSON.parse(cached).at < 10 * 60 * 1000) {
        data = JSON.parse(cached).data;   // reuse for 10 minutes
    } else {
        baseUrl = 'https://api.open-meteo.com/v1/forecast';
        params = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,
            current: ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m', 'is_day'],
            daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
            timezone: 'auto',
        });
    }
    try {
        //const response = await fetch(`${baseUrl}?${params.toString()}`);
        const response = await fetch(`${baseUrl}?${String(params)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        data = await response.json();
        sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data }));
        //return data;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        document.getElementById('Condition').textContent = 'Weather unavailable';
    }
    const icon = document.getElementById('current-weather-icon');
    if (data.current.is_day) icon.src = `https://unpkg.com/@meteocons/svg/fill/${WEATHER_CODES[data.current.weather_code].day}.svg`;
    else icon.src = `https://unpkg.com/@meteocons/svg/fill/${WEATHER_CODES[data.current.weather_code].night}.svg`;
    icon.alt = WEATHER_CODES[data.current.weather_code].label;

    renderTemp(document.getElementById('Tempature'), getTempToggle, data.current.temperature_2m);
    renderFeelsLike(document.getElementById('feels-like'), getFeelsLikeToggle, data.current.apparent_temperature);
    renderCondition(document.getElementById('Condition'), getConditionToggle, WEATHER_CODES[data.current.weather_code].label ?? 'Unknown');
    renderHumidity(document.getElementById('Humidity'), getHumidityToggle, data.current.relative_humidity_2m);
    renderWindSpeed(document.getElementById('wind'), getWindToggle, data.current.wind_speed_10m);

    // just an ugly fix ---- this is a note to make this array not need to be dublicated later -- its me being lazy
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const today = new Date();
    const date = new Date(`${today.getMonth()+1} ${today.getDate()}, ${today.getFullYear()}`);
    const dayName = document.getElementsByClassName('day-name');
    const high = document.getElementsByClassName('high-temp');
    const low = document.getElementsByClassName('low-temp');
    for (var i = 0; i < 7; i++){
        dayName[i].textContent = days[date.getDay()+i];
        high[i].innerHTML = `High: <b>${data.daily.temperature_2m_max[i]}</b>`;
        low[i].innerHTML = `Low: <b>${data.daily.temperature_2m_min[i]}</b>`;
    }
}


function formatTempature(degrees, type, roundTemp, isFeelsLike) {
    if (isFeelsLike == true) {
        if (type == 'C') {
            return roundTemp ? `${Math.round(degrees)}°C` : `${degrees}°C`;
        } else if (type == 'F') {
            return roundTemp ? `${Math.round(calcF(degrees))}°F` : `${calcF(degrees)}°F`;
        } else if (type == 'K') {
            return roundTemp ? `${Math.round(calcK(degrees))}K` : `${calcK(degrees)}K`;
        }
    } else {
        if (type == 'C') {
            return roundTemp ? `Feels like <b>${Math.round(degrees)}°C</b>` : `Feels like <b>${degrees}°C</b>`;
        } else if (type == 'F') {
            return roundTemp ? `Feels like <b>${Math.round(calcF(degrees))}°F</b>` : `Feels like <b>${calcF(degrees)}°F</b>`;
        } else if (type == 'K') {
            return roundTemp ? `Feels like <b>${Math.round(calcK(degrees))}K</b>` : `Feels like <b>${calcK(degrees)}K</b>`;
        }
    }
}

const renderTemp = (p, show, currentTemp) => show ? p.textContent = formatTempature(currentTemp, getTempUnit, !getTempRoundToggle, true) : p.textContent = '';
const renderFeelsLike = (p, show, feelsLike) => show ? p.innerHTML = formatTempature(feelsLike, getTempUnit, !getTempRoundToggle, false) : p.textContent = '';
const renderCondition = (p, show, condition) => show ? p.textContent = condition : p.textContent = '';
const renderHumidity = (p, show, humidity) => show ? p.innerHTML = `Humidity <b>${humidity}%</b>` : p.textContent = '';
const renderWindSpeed = (p, show, wind) => show ? p.innerHTML = `Wind Speed <b>${wind}km/h</b>` : p.textContent = '';

/*function getWeatherIcon(code, isDay) {
    const entry = wmoToIcon[code] || { day: "unknown", night: "unknown", label: "Unknown" };
    return {
        iconName: isDay === 1 ? entry.day : entry.night,
        description: entry.label,
    };
}*/

/*export async function fillForecast(latitude, longitude) {
    const cacheKey = `weather:${latitude},${longitude}`;
    
    try {
        let daily;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached && Date.now() - JSON.parse(cached).at < 10 * 60 * 1000) {
            daily = JSON.parse(cached).daily;   // reuse for 10 minutes
        } else {
            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.searchParams.set('latitude', latitude);
            url.searchParams.set('longitude', longitude);
            url.searchParams.set('daily', 'temperature_2m_max, temperature_2m_min');
            url.searchParams.set('timezone', 'auto');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            daily = (await response.json()).daily;
            sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), daily }));
        }
        return daily;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        document.getElementById('Condition').textContent = 'Weather unavailable';
    }
}*/