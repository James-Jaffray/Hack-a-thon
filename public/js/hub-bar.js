import { getMe } from './api.js';

// Show which hub we're in
const result = await getMe();
if (result.ok && result.data) {
    document.querySelectorAll('.hub-name').forEach((el) => {
        el.textContent = result.data.hubName;
    });
}

// "Switch hub" = the list of your hubs (you can also create one or log out there)
document.querySelectorAll('.switch-hub').forEach((button) => {
    button.addEventListener('click', () => {
        window.location.href = 'hubs.html';
    });
});