const parseBool = (str) => typeof str === 'string' && str.trim().toLowerCase() === 'true';

const getClockToggle = parseBool(localStorage.getItem('isClockToggled'));
const getSecondsToggle = parseBool(localStorage.getItem('isSecondsToggled'));
const getMillisecondsToggle = parseBool(localStorage.getItem('isMillisecondsToggled'));
const getClockFormat = localStorage.getItem('clockFormat');
const getDateToggle = parseBool(localStorage.getItem('isDateToggled'));
const getWeekdayToggle = parseBool(localStorage.getItem('isWeekdayToggled'));
const getDateFormat = localStorage.getItem('dateFormat');

export function getDate() {
    if (getDateToggle) {
        if (getDateFormat == 'mdy') {
            document.getElementById('date').textContent = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        } else if (getDateFormat == 'dmy') {
            document.getElementById('date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } else if (getDateFormat == 'ymd') {
            document.getElementById('date').textContent = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
        }
    }
}

export function updateClock() {
    if (getClockToggle) {
        const today = new Date();
        document.getElementById('time').textContent = `${today.getHours()}:${checkTime(today.getMinutes())}`;
        setTimeout(updateClock, 1000);
    }
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};
  return i;
}