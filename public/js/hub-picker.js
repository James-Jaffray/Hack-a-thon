import { getMe, createHub, switchHub, logout } from './api.js';

// hubs.html: pick one of your hubs, or create one. New accounts land here.
const me = await getMe();
if (!me.ok) window.location.href = 'login.html';

document.querySelector('#account').textContent = me.data?.account ?? '';

const hubs = me.data?.hubs ?? [];
document.querySelector('#your-hubs').hidden = hubs.length === 0;
document.querySelector('#hub-list').replaceChildren(...hubs.map((hub) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = hub.name;      // textContent, so a hub name can't inject HTML
    button.addEventListener('click', async () => {
        if ((await switchHub(hub.id)).ok) window.location.href = 'index.html';
    });
    const item = document.createElement('li');
    item.append(button);
    return item;
}));

document.querySelector('#create-hub-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await createHub(document.querySelector('#hub-name').value);
    // New hub: go to the dashboard, where the invite links and calendars are
    if (result.ok) window.location.href = 'dashboard.html';
    else document.querySelector('#create-hub-error').textContent = result.data?.error || 'Could not create the hub.';
});

document.querySelector('#logout-button').addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
});
