
import { getMe } from './api.js';

try {
    const result = await getMe();

    if (result.status === 401) {
        window.location.href = 'login.html';
    } else if (result.ok && !result.data?.hubName) {
        window.location.href = 'hubs.html';     // signed in, but not in a hub yet
    } else if (result.data?.active === false && !location.pathname.endsWith('dashboard.html')) {
        // The dashboard stays reachable so the owner can reactivate
        document.body.textContent = 'This hub has been deactivated by its owner.';
    } else if (!result.ok) {
        document.body.textContent =
            'Unable to verify your login. Please try again later.';
    }
} catch (error) {
    console.error('Authentication check failed:', error);

    document.body.textContent =
        'Unable to connect to the server. Please try again later.';
}
