const API_KEY = 'AIzaSyD7UAL31zJcctwraDo0ZpTGJsAzjkloFsc';
const lat = 53.5461;
const lng = -113.4938;

async function getCurrentWeather(latitude, longitude) {
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
    
    return data;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
  }
}

getCurrentWeather(lat, lng);