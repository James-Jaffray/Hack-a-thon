import {
    addApple,
    getConnections,
    deleteConnection,
    updateConnection
} from './api.js';

import { renderCalendarPicker } from './calendar-picker.js';

const list = document.querySelector('#connected-calendars');

const appleForm = document.querySelector('#apple-calendar-form');
const message = document.querySelector('#apple-calendar-success');
const errorMessage = document.querySelector('#apple-calendar-error');

const googleConnectButton = document.querySelector('#google-connect');

// Display the result of Google OAuth
const googleResult = new URLSearchParams(location.search).get('google');

if (googleResult) {
    message.textContent = {
        connected: 'Google Calendar connected. Tick the calendars you want to share below.',
        denied: 'Google access was denied.',
        error: 'Something went wrong connecting to Google. Try again.',
    }[googleResult] ?? '';

    history.replaceState(null, '', location.pathname);
}

// Connect Google: a normal page navigation, because Google's consent screen is a full page
googleConnectButton.addEventListener('click', () => {
    location.href = '/auth/google';
});

// One row: calendar name and disconnect. The show toggle and the Google picker
// only appear on your own calendars (canEdit); the server enforces the same rule.
function renderConnection(connection) {
    const listItem = document.createElement('li');

    const calendarName = document.createElement('span');
    // displayName is hidden by the server for other people's calendars
    calendarName.textContent = connection.displayName
        ? `${connection.displayName} (${connection.provider})`
        : `${connection.provider} calendar`;

    const disconnectButton = document.createElement('button');
    disconnectButton.type = 'button';
    disconnectButton.textContent = 'Disconnect';

    disconnectButton.addEventListener('click', async () => {
        const confirmed = confirm(
            `Are you sure you want to disconnect ${connection.displayName ?? 'this calendar'}?`
        );
        if (!confirmed) return;

        const result = await deleteConnection(connection.id);

        if (result.ok) {
            await loadConnections();
        } else {
            errorMessage.textContent = "Couldn't disconnect that calendar.";
        }
    });

    listItem.append(calendarName, ' ', disconnectButton);

    if (!connection.canEdit) return listItem;

    // Show/hide this whole connection (works for Google and Apple)
    const toggleContainer = document.createElement('div');
    toggleContainer.classList.add('google-calendars');

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = connection.isEnabled;

    const toggleText = document.createElement('span');
    toggleText.textContent = 'Show calendar';

    checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;

        try {
            const result = await updateConnection(connection.id, checkbox.checked);

            if (!result.ok) {
                checkbox.checked = connection.isEnabled;
                errorMessage.textContent =
                    result.data?.error || 'Unable to update calendar settings.';
                return;
            }

            connection.isEnabled = result.data.isEnabled;
            errorMessage.textContent = '';
        } catch (error) {
            console.error('Failed to update calendar:', error);
            checkbox.checked = connection.isEnabled;
            errorMessage.textContent =
                'Unable to connect to the server. Please try again.';
        } finally {
            checkbox.disabled = false;
        }
    });

    label.append(checkbox, toggleText);
    toggleContainer.append(label);
    listItem.append(toggleContainer);

    // Google also gets the per-calendar picker
    if (connection.provider === 'google') {
        const picker = document.createElement('div');
        picker.classList.add('google-calendars');

        listItem.append(picker);
        renderCalendarPicker(picker, connection.id);
    }

    return listItem;
}

async function loadConnections() {
    const result = await getConnections();

    list.replaceChildren();

    if (!result.ok || !result.data) {
        list.textContent = "Couldn't load calendars.";
        return;
    }

    if (result.data.length === 0) {
        list.textContent = 'No calendars connected yet.';
        return;
    }

    // Group by owner (Map keeps insertion order)
    const groups = new Map();
    for (const connection of result.data) {
        const owner = connection.ownerName || connection.displayName;
        if (!groups.has(owner)) groups.set(owner, []);
        groups.get(owner).push(connection);
    }

    for (const [owner, connections] of groups) {
        const group = document.createElement('li');

        const heading = document.createElement('h4');
        heading.textContent = owner;

        const inner = document.createElement('ul');
        connections.forEach((c) => inner.append(renderConnection(c)));

        group.append(heading, inner);
        list.append(group);
    }
}

// Add an Apple Calendar
appleForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    errorMessage.textContent = '';
    message.textContent = '';

    const icsUrl = document.querySelector('#apple-calendar-url').value.trim();
    const displayName = document.querySelector('#apple-calendar-name').value.trim();

    try {
        const result = await addApple(icsUrl, displayName);

        if (!result.ok) {
            errorMessage.textContent =
                result.data?.error || "Couldn't add that calendar.";
            return;
        }

        message.textContent = 'Calendar connected successfully!';

        appleForm.reset();
        await loadConnections();
    } catch (error) {
        console.error('Failed to add Apple Calendar:', error);
        errorMessage.textContent =
            'Unable to connect to the server. Please try again.';
    }
});

// Load connections when the dashboard opens
loadConnections();