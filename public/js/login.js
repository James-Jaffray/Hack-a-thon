
import { login, signup } from './api.js';
import { fillHubList, saveHub } from './hubs.js';

fillHubList(document.querySelector('#saved-hubs'));

// Login elements
const loginTab = document.querySelector('#login-tab');
const signupTab = document.querySelector('#signup-tab');

const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');

// Switch to the login form
loginTab.addEventListener('click', () => {
    loginForm.hidden = false;
    signupForm.hidden = true;
});

// Switch to the signup form
signupTab.addEventListener('click', () => {
    loginForm.hidden = true;
    signupForm.hidden = false;
});


// Signup form elements
const signupEmail = document.querySelector('#signup-email');
const signupPassword = document.querySelector('#signup-password');
const signupError = document.querySelector('#signup-error');

// Handle signup form submission

signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Clear previous error
    signupError.textContent = '';

    const email = signupEmail.value;
    const password = signupPassword.value;

    try {
        const result = await signup(email, password);

        if (result.ok) {
            saveHub(email.trim().toLowerCase());
            window.location.href = 'index.html';
        } else {
            signupError.textContent =
                result.data?.error || 'Signup failed. Please try again.';
        }

    } catch (error) {
        signupError.textContent = 'Unable to connect to the server.';
        console.error('Signup error:', error);
    }
});


// Login form elements
const loginEmail = document.querySelector('#login-email');
const loginPassword = document.querySelector('#login-password');
const loginError = document.querySelector('#login-error');

// Handle login form submission
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    loginError.textContent = '';

    const email = loginEmail.value;
    const password = loginPassword.value;

    try {
        const result = await login(email, password);

        if (result.ok) {
            saveHub(email.trim().toLowerCase());
            window.location.href = 'index.html';
        } else {
            loginError.textContent =
                result.data?.error || 'Login failed. Please try again.';
        }
    } catch (error) {
        loginError.textContent = 'Unable to connect to the server.';
        console.error(error);
    }
});