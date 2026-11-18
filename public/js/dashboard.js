import { getMe, logout, getShortcuts, saveShortcut, deleteShortcut, saveHubSettings } from './api.js';

const logoutButton = document.querySelector('#logout-button');

logoutButton.addEventListener('click', async () => {
    try {
        const result = await logout();

        if (result.ok) {
            window.location.href = 'login.html';
        } else {
            console.error('Logout failed:', result.data);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
});

function findActiveRadioValue(elements) {
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].checked) return elements[i].value;
    }
}

function setRadioToCorrectSpot(elements, searchingValue) {
    for (const element of elements) {
        if (element.value == searchingValue) {
            element.checked = true;
            break;
        }
    }
}

// ---- Weather Display ----

const getTempToggle = localStorage.getItem('isTempToggled');
const getFeelsLikeToggle = localStorage.getItem('isFeelsLikeToggled');
const getConditionToggle = localStorage.getItem('isConditionToggled');
const getHumidityToggle = localStorage.getItem('isHumidityToggled');
const getWindToggle = localStorage.getItem('isWindToggled');
const getForecastBtnToggle = localStorage.getItem('isForecastBtnToggled');
const getWeatherIconToggle = localStorage.getItem('isWeatherIconToggled');
const getTempUnit = localStorage.getItem('tempatureUnit');
const getTempShowDecToggle = localStorage.getItem('isDecInTempToggled');
const getWindSpeedUnit = localStorage.getItem('windSpeedUnit');
const getPrecipUnit = localStorage.getItem('precipUnit');

const tempToggle = document.getElementById('temperature-check');
const feelsLikeToggle = document.getElementById('feels-like-check');
const conditionToggle = document.getElementById('condition-check');
const humidityToggle = document.getElementById('humidity-check');
const windToggle = document.getElementById('wind-check');
const forecastBtnToggle = document.getElementById('forecast-btn-check');
const weatherIconToggle = document.getElementById('weather-icon-check');
const tempUnitOpts = document.getElementsByName('tempature-unit');
const showDecimalTempToggle = document.getElementById('show-decimal');
const windSpeedOpts = document.getElementsByName('speed-unit');
const precipOpts = document.getElementsByName('percip-unit');

if (getTempToggle == null) localStorage.setItem('isTempToggled', tempToggle.checked);
if (getFeelsLikeToggle == null) localStorage.setItem('isFeelsLikeToggled', feelsLikeToggle.checked);
if (getConditionToggle == null) localStorage.setItem('isConditionToggled', conditionToggle.checked);
if (getHumidityToggle == null) localStorage.setItem('isHumidityToggled', humidityToggle.checked);
if (getWindToggle == null) localStorage.setItem('isWindToggled', windToggle.checked);
if (getForecastBtnToggle == null) localStorage.setItem('isForecastBtnToggled', forecastBtnToggle.checked);
if (getWeatherIconToggle == null) localStorage.setItem('isWeatherIconToggled', weatherIconToggle.checked);
if (getTempUnit == null) localStorage.setItem('tempatureUnit', findActiveRadioValue(tempUnitOpts));
if (getTempShowDecToggle == null) localStorage.setItem('isDecInTempToggled', showDecimalTempToggle.checked);
if (getWindSpeedUnit == null) localStorage.setItem('windSpeedUnit', findActiveRadioValue(windSpeedOpts));
if (getPrecipUnit == null) localStorage.setItem('precipUnit', findActiveRadioValue(precipOpts));

tempToggle.addEventListener('click', () => {
    localStorage.setItem('isTempToggled', tempToggle.checked);
});

feelsLikeToggle.addEventListener('click', () => {
    localStorage.setItem('isFeelsLikeToggled', feelsLikeToggle.checked);
});

conditionToggle.addEventListener('click', () => {
    localStorage.setItem('isConditionToggled', conditionToggle.checked);
});

humidityToggle.addEventListener('click', () => {
    localStorage.setItem('isHumidityToggled', humidityToggle.checked);
});

windToggle.addEventListener('click', () => {
    localStorage.setItem('isWindToggled', windToggle.checked);
});

forecastBtnToggle.addEventListener('click', () => {
    localStorage.setItem('isForecastBtnToggled', forecastBtnToggle.checked);
});

weatherIconToggle.addEventListener('click', () => {
    localStorage.setItem('isWeatherIconToggled', weatherIconToggle.checked);
});

for (const option of tempUnitOpts) {
    option.addEventListener('click', () => {
        localStorage.setItem('tempatureUnit', option.value);
    });
}

showDecimalTempToggle.addEventListener('click', () => {
    localStorage.setItem('isDecInTempToggled', showDecimalTempToggle.checked);
});

for (const option of windSpeedOpts) {
    option.addEventListener('click', () => {
        localStorage.setItem('windSpeedUnit', option.value);
    });
}

for (const option of precipOpts) {
    option.addEventListener('click', () => {
        localStorage.setItem('precipUnit', option.value);
    });
}

tempToggle.checked = getTempToggle === "true";
feelsLikeToggle.checked = getFeelsLikeToggle === "true";
conditionToggle.checked = getConditionToggle === "true";
humidityToggle.checked = getHumidityToggle === "true";
windToggle.checked = getWindToggle === "true";
forecastBtnToggle.checked = getForecastBtnToggle === "true";
weatherIconToggle.checked = getWeatherIconToggle === "true";
setRadioToCorrectSpot(tempUnitOpts, getTempUnit);
showDecimalTempToggle.checked = getTempShowDecToggle === "true";
setRadioToCorrectSpot(windSpeedOpts, getWindSpeedUnit);
setRadioToCorrectSpot(precipOpts, getPrecipUnit);

// ---- Clock and Date Display ----
const getClockToggle = localStorage.getItem('isClockToggled');
const getSecondsToggle = localStorage.getItem('isSecondsToggled');
const getMillisecondsToggle = localStorage.getItem('isMillisecondsToggled');
const getClockFormat = localStorage.getItem('clockFormat');
const getDateToggle = localStorage.getItem('isDateToggled');
const getDateFormat = localStorage.getItem('dateFormat');

const clockToggle = document.getElementById('show-clock');
const secondsToggle = document.getElementById('show-seconds');
const millisecondsToggle = document.getElementById('show-milli');
const clockFormats = document.getElementsByName('clock-format');
const dateToggle = document.getElementById('show-date');
const dateFormats = document.getElementsByName('date-format');

if (getClockToggle == null) localStorage.setItem('isClockToggled', clockToggle.checked);
if (getSecondsToggle == null) localStorage.setItem('isSecondsToggled', secondsToggle.checked);
if (getMillisecondsToggle == null) localStorage.setItem('isMillisecondsToggled', millisecondsToggle.checked);
if (getClockFormat == null) localStorage.setItem('clockFormat', findActiveRadioValue(clockFormats));
if (getDateToggle == null) localStorage.setItem('isDateToggled', dateToggle.checked);
if (getDateFormat == null) localStorage.setItem('dateFormat', findActiveRadioValue(dateFormats));

clockToggle.addEventListener('click', () => {
    localStorage.setItem('isClockedToggled', clockToggle.checked);
});

secondsToggle.addEventListener('click', () => {
    localStorage.setItem('isSecondsToggled', secondsToggle.checked);
});

millisecondsToggle.addEventListener('click', () => {
    localStorage.setItem('isMillisecondsToggled', millisecondsToggle.checked);
});

for (const format of clockFormats) {
    format.addEventListener('click', () => {
        localStorage.setItem('clockFormat', format.value);
    });
}

dateToggle.addEventListener('click', () => {
    localStorage.setItem('isDateToggled', dateToggle.checked);
});

for (const format of dateFormats) {
    format.addEventListener('click', () => {
        localStorage.setItem('dateFormat', format.value);
    });
}

clockToggle.checked = getClockToggle === "true";
secondsToggle.checked = getSecondsToggle === "true";
millisecondsToggle.checked = getMillisecondsToggle === "true";
setRadioToCorrectSpot(clockFormats, getClockFormat);
dateToggle.checked = getDateToggle === "true";
setRadioToCorrectSpot(dateFormats, getDateFormat);

// ---- Shortcuts ----
const labelInput = document.querySelector('#shortcut-label');
const linkInput = document.querySelector('#shortcut-link');
const submitButton = document.querySelector('#submit-shortcut');
const currentList = document.querySelector('#current-shortcuts');
const shortcutError = document.querySelector('#shortcut-error');

// Personal mode: a signed-in member edits their own set. Shared mode: only the owner edits.
const personal = me?.shortcutMode === 'personal' && Boolean(me?.member?.name);
const canEditShortcuts = personal || isOwner;

document.querySelector('#new-shortcut').hidden = !canEditShortcuts;
document.querySelector('#shortcut-note').textContent =
    personal ? 'These are your own shortcuts. Only you can see them.'
    : isOwner ? 'Everyone in the hub sees these shortcuts.'
    : me?.shortcutMode === 'personal' ? 'Choose a display name below to set your own shortcuts.'
    : 'Everyone in the hub sees these shortcuts. Only the hub owner can change them.';

async function renderShortcuts() {
    const { ok, data } = await getShortcuts();
    currentList.replaceChildren();
    if (!ok) {
        currentList.textContent = "Couldn't load shortcuts";
        return [];
    }
    for (const s of data) {
        const row = document.createElement('div');
        row.textContent = `${s.label} (${s.url}) `;   // textContent, so labels can't inject HTML
        if (canEditShortcuts) {
            const del = document.createElement('button');
            del.type = 'button';
            del.textContent = 'Delete';
            del.addEventListener('click', async () => {
                await deleteShortcut(s.position);
                renderShortcuts();
            });
            row.append(del);
        }
        currentList.append(row);
    }
    return data;
}

submitButton.addEventListener('click', async () => {
    shortcutError.textContent = '';
    const existing = await renderShortcuts();
    const used = new Set(existing.map(s => s.position));
    let position = 1;
    while (used.has(position)) position++;          // first free slot, 1-5
    if (position > 5) {
        shortcutError.textContent = 'You can have at most 5 shortcuts';
        return;
    }

    const result = await saveShortcut(position, labelInput.value, linkInput.value);
    if (!result.ok) {
        shortcutError.textContent = result.data?.error ?? 'Could not save';
        return;
    }
    labelInput.value = '';
    linkInput.value = '';
    renderShortcuts();
});

renderShortcuts();