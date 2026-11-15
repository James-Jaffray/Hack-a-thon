
import { getMe } from './api.js';

try {
    const result = await getMe();

    if (result.status === 401) {
        window.location.href = 'login.html';
    } else if (!result.ok) {
        document.body.textContent =
            'Unable to verify your login. Please try again later.';
    }
} catch (error) {
    console.error('Authentication check failed:', error);

    document.body.textContent =
        'Unable to connect to the server. Please try again later.';
}
