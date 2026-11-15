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

        document.getElementById('Tempature').textContent = `Tempature: ${Math.round(current.temperature_2m)} °C`;
        document.getElementById('feels-like').textContent = `Feels Like: ${Math.round(current.apparent_temperature)} °C`;
        document.getElementById('Condition').textContent = `Condition: ${WEATHER_CODES[current.weather_code] ?? 'Unknown'}`;
        document.getElementById('Humidity').textContent = `Humidity: ${current.relative_humidity_2m}%`;

        return current;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        document.getElementById('Condition').textContent = 'Weather unavailable';
    }
}