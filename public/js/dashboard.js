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

if (getTempToggle === null) localStorage.setItem('isTempToggled', tempToggle.checked);
if (getFeelsLikeToggle === null) localStorage.setItem('isFeelsLikeToggled', feelsLikeToggle.checked);
if (getConditionToggle === null) localStorage.setItem('isConditionToggled', conditionToggle.checked);
if (getHumidityToggle === null) localStorage.setItem('isHumidityToggled', humidityToggle.checked);
if (getWindToggle === null) localStorage.setItem('isWindToggled', windToggle.checked);
if (getForecastBtnToggle === null) localStorage.setItem('isForecastBtnToggled', forecastBtnToggle.checked);
if (getWeatherIconToggle === null) localStorage.setItem('isWeatherIconToggled', weatherIconToggle.checked);
if (getTempUnit === null) localStorage.setItem('tempatureUnit', findActiveRadioValue(tempUnitOpts));
if (getTempShowDecToggle === null) localStorage.setItem('isDecInTempToggled', showDecimalTempToggle.checked);
if (getWindSpeedUnit === null) localStorage.setItem('windSpeedUnit', findActiveRadioValue(windSpeedOpts));
if (getPrecipUnit === null) localStorage.setItem('precipUnit', findActiveRadioValue(precipOpts));

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

for (let i = 0; i < tempUnitOpts.length; i++) {
    tempUnitOpts[i].addEventListener('click', () => {
        localStorage.setItem('tempatureUnit', tempUnitOpts[i].value);
    });
}

showDecimalTempToggle.addEventListener('click', () => {
    localStorage.setItem('isDecInTempToggled', showDecimalTempToggle.checked);
});

for (let i = 0; i < windSpeedOpts.length; i++) {
    windSpeedOpts[i].addEventListener('click', () => {
        localStorage.setItem('windSpeedUnit', windSpeedOpts[i].value);
    });
}

for (let i = 0; i < precipOpts.length; i++) {
    precipOpts[i].addEventListener('click', () => {
        localStorage.setItem('precipUnit', precipOpts[i].value);
    });
}

window.addEventListener("load", () => {
    tempToggle.checked = getTempToggle === "true";
    feelsLikeToggle.checked = getFeelsLikeToggle === "true";
    conditionToggle.checked = getConditionToggle === "true";
    humidityToggle.checked = getHumidityToggle === "true";
    windToggle.checked = getWindToggle === "true";
    forecastBtnToggle.checked = getForecastBtnToggle === "true";
    weatherIconToggle.checked = getWeatherIconToggle === "true";
    for (let i = 0; i < tempUnitOpts.length; i++) {
        if (tempUnitOpts[i].value == getTempUnit) {
            tempUnitOpts[i].checked = true;
            break;
        }
    }
    showDecimalTempToggle.checked = getTempShowDecToggle === "true";
    for (let i = 0; i < windSpeedOpts.length; i++) {
        if (windSpeedOpts[i].value == getWindSpeedUnit) {
            windSpeedOpts[i].checked = true;
            break;
        }
    }
    for (let i = 0; i < precipOpts.length; i++) {
        if (precipOpts[i].value == getPrecipUnit) {
            precipOpts[i].checked = true;
            break;
        }
    }
});

// ---- Clock and Date Display ----


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