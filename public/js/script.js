import { getCurrentWeather, fillForecast } from "./weather.js";
import { renderShortcuts, shortcuts } from "./shortcuts.js";
import { updateClock, getDate } from "./clock.js";

//getLocation();
getCurrentWeather( 53.5461, -113.4938);

getDate();
updateClock();

renderShortcuts();

const showForecastBtn = document.getElementById('show-forecastBtn');
const exitForcestBtn = document.getElementById('exit-forecastBtn');
const forecastModal = document.getElementById('forecastModal');

showForecastBtn.addEventListener('click', () => {
  forecastModal.style.display = 'block';
});

exitForcestBtn.addEventListener('click', () => {
  forecastModal.style.display = 'none';
});

fillForecast();