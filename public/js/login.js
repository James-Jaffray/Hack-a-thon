import { login, signup, logout, getMe, getInvite, acceptInvite } from './api.js';

const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');
const inviteNote = document.querySelector('#invite-note');

// Into the hub, or to the hub list if they have no hub (or several) yet
function enter(hubId) {
    window.location.href = hubId ? 'index.html' : 'hubs.html';
}

function showForm(form) {
    loginForm.hidden = form !== loginForm;
    signupForm.hidden = form !== signupForm;
}
document.querySelector('#login-tab').addEventListener('click', () => showForm(loginForm));
document.querySelector('#signup-tab').addEventListener('click', () => showForm(signupForm));

// Both forms work the same way: send the fields, then go in or show the error.
// If an invite link is waiting, the server uses it as part of logging in or signing up.
function wire(form, send) {
    const error = form.querySelector('[role="alert"]');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';
        const { email, password, name } = Object.fromEntries(new FormData(form));
        try {
            const result = await send(email, password, name);
            if (result.ok) enter(result.data.hubId);
            else error.textContent = result.data?.error || 'Something went wrong. Please try again.';
        } catch (err) {
            error.textContent = 'Unable to connect to the server.';
            console.error(err);
        }
    });
}
wire(loginForm, login);
wire(signupForm, signup);

// ---- Arriving from an invite link, or already signed in ----
const invite = await getInvite();
const hubName = invite.data?.hubName;
const me = await getMe();

if (!invite.ok) {
    inviteNote.textContent = `${invite.data?.error ?? 'This invite link did not work'}. Ask the hub owner for a new one.`;
} else if (hubName && me.ok) {
    // Already signed in: ask before joining, so a link can't add you to a hub by itself
    inviteNote.textContent = `You've been invited to join "${hubName}". You are signed in as ${me.data.account}.`;
    document.querySelector('#auth-forms').hidden = true;
    document.querySelector('#invite-join').hidden = false;
} else if (hubName) {
    inviteNote.textContent = `You've been invited to join "${hubName}". Create an account or log in to join.`;
    showForm(signupForm);
} else if (me.ok) {
    enter(me.data.hubName);     // nothing to do on this page
}

document.querySelector('#join-button').addEventListener('click', async () => {
    const result = await acceptInvite();
    if (result.ok) enter(result.data.hubId);
    else inviteNote.textContent = result.data?.error || 'Something went wrong. Please try again.';
});

// Logging out clears the whole session, so open the invite link again afterwards
document.querySelector('#other-account-button').addEventListener('click', async () => {
    await logout();
    inviteNote.textContent = 'Signed out. Open the invite link again to join with another account.';
    document.querySelector('#auth-forms').hidden = false;
    document.querySelector('#invite-join').hidden = true;
});
