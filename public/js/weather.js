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
    testCoords();
}

function error() {
    alert("Sorry, no position available.");
}

function testCoords() {
    console.log(`latitude: ${latitude}`);
    console.log(`longitude: ${longitude}`);
}

const getTempToggle = localStorage.getItem("isTempToggled") === "true";
const getFeelsLikeToggle = localStorage.getItem("isFeelsLikeToggled") === "true";
const getConditionToggle = localStorage.getItem("isConditionToggled") === "true";
const getHumidityToggle = localStorage.getItem("isHumidityToggled") === "true";

const WEATHER_CODES = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
    85: 'Snow showers', 86: 'Snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
};

export async function getCurrentWeather(latitude, longitude) {
    const cacheKey = `weather:${latitude},${longitude}`;

    try {
        let current;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached && Date.now() - JSON.parse(cached).at < 10 * 60 * 1000) {
            current = JSON.parse(cached).current;   // reuse for 10 minutes
        } else {
            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.searchParams.set('latitude', latitude);
            url.searchParams.set('longitude', longitude);
            url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code');
            url.searchParams.set('timezone', 'auto');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            current = (await response.json()).current;
            sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), current }));
        }

        renderTemp(document.getElementById('Tempature'), getTempToggle, current.temperature_2m);
        renderFeelsLike(document.getElementById('feels-like'), getFeelsLikeToggle, current.apparent_temperature);
        renderCondition(document.getElementById('Condition'), getConditionToggle, WEATHER_CODES[current.weather_code] ?? 'Unknown');
        renderHumidity(document.getElementById('Humidity'), getHumidityToggle, current.relative_humidity_2m);
        
        return current;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        document.getElementById('Condition').textContent = 'Weather unavailable';
    }
}

const renderTemp = (para, show, currentTemp) => show ? para.textContent = `Temperature: ${currentTemp} °C` : para.textContent = '';
const renderFeelsLike = (para, show, feelsLike) => show ? para.textContent = `Feels Like ${feelsLike} °C` : para.textContent = '';
const renderCondition = (para, show, condition) => show ? para.textContent = `Condition: ${condition}` : para.textContent = '';
const renderHumidity = (para, show, humidity) => show ? para.textContent = `Humidity ${humidity}%` : para.textContent = '';

export async function fillForecast(latitude, longitude) {
    const cacheKey = `weather:${latitude},${longitude}`;

    try {
        let current;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached && Date.now() - JSON.parse(cached).at < 10 * 60 * 1000) {
            current = JSON.parse(cached).current;   // reuse for 10 minutes
        } else {
            const today = new Date();
            const date = new Date(`${today.getMonth()+1} ${today.getDate()}, ${today.getFullYear()}`);
            console.log(date);
            const days = document.getElementsByClassName('day-name');
            
        }
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        document.getElementById('Condition').textContent = 'Weather unavailable';
    }
}