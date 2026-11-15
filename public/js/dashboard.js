import { logout } from './api.js';

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