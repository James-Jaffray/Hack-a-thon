let latitude = 0;
let longitude = 0;
const API_KEY = 'AIzaSyD7UAL31zJcctwraDo0ZpTGJsAzjkloFsc';

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

export async function getCurrentWeather(latitude, longitude) {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('location.latitude', latitude);
  url.searchParams.append('location.longitude', longitude);
  url.searchParams.append('unitsSystem', 'METRIC'); 

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Condition:', data.weatherCondition?.description?.text);
    console.log('Temperature:', data.temperature?.degrees, data.temperature?.unit);
    console.log('Feels Like:', data.feelsLikeTemperature?.degrees);
    console.log('Humidity:', data.relativeHumidity + '%');

    const temperature = document.getElementById('Tempature');
    temperature.textContent = `Tempature: ${data.temperature?.degrees} ${data.temperature?.unit}`;

    const feelsLike = document.getElementById('feels-like');
    feelsLike.textContent = `Feels Like: ${data.feelsLikeTemperature?.degrees}  ${data.temperature?.unit}`;

    const condition = document.getElementById('Condition');
    condition.textContent = `Condition: ${data.weatherCondition?.description?.text}`

    const Humidity = document.getElementById('Humidity');
    Humidity.textContent = `Humidity: ${data.relativeHumidity}%`;


    return data;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
  }
}