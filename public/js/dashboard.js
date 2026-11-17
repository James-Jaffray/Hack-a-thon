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

// ---- Weather ----
// The toggles are hub settings stored on the server: everyone in the hub sees the
// same weather, and only the owner can change it (the server enforces that).
const me = (await getMe()).data;
const isOwner = me?.member?.role === 'owner';

const weatherToggles = {
    isTempToggled: '#temperature-check',
    isFeelsLikeToggled: '#feels-like-check',
    isConditionToggled: '#condition-check',
    isHumidityToggled: '#humidity-check',
};

for (const [key, selector] of Object.entries(weatherToggles)) {
    const box = document.querySelector(selector);
    box.checked = me?.settings?.[key] !== false;    // shown unless the owner switched it off
    box.disabled = !isOwner;

    box.addEventListener('change', async () => {
        const result = await saveHubSettings({ settings: { [key]: box.checked } });
        if (!result.ok) box.checked = !box.checked;  // put it back if the save failed
    });
}


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