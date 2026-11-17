import { getMe, setMemberName } from './api.js';

// Your display name in this hub. You need one before you can add or manage calendars.
const error = document.querySelector('#member-error');
const member = (await getMe()).data?.member;

// Someone who signed in with Google, or whose name was already taken in this hub, has none yet
const named = Boolean(member?.name);
const nameForm = document.querySelector('#member-name-form');

nameForm.hidden = named;
document.querySelector('#member-signed-in').hidden = !named;
document.querySelector('#add-calendars').hidden = !named;
if (named) document.querySelector('#member-current').textContent = member.name;

nameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await setMemberName(document.querySelector('#display-name').value);

    if (result.ok) location.reload();
    else error.textContent = result.data?.error || 'Something went wrong. Try again.';
});
