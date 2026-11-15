import { getMe, logout } from './api.js';

// Show which hub we're in (the "email" field holds the hub name)
const result = await getMe();
if (result.ok && result.data) {
    document.querySelectorAll('.hub-name').forEach((el) => {
        el.textContent = result.data.email;
    });
}

// "Switch hub" = log out, then land on the login page
document.querySelectorAll('.switch-hub').forEach((button) => {
    button.addEventListener('click', async () => {
        await logout();
        window.location.href = 'login.html';
    });
});