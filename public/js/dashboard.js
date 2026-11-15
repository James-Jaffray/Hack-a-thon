import { logout, getShortcuts, saveShortcut, deleteShortcut } from './api.js';

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

// ---- Shortcuts ----
const labelInput = document.querySelector('#shortcut-label');
const linkInput = document.querySelector('#shortcut-link');
const submitButton = document.querySelector('#submit-shortcut');
const currentList = document.querySelector('#current-shortcuts');
const shortcutError = document.querySelector('#shortcut-error');

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
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
            await deleteShortcut(s.position);
            renderShortcuts();
        });
        row.append(del);
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