import {
    getMe, getMembers, removeMember, banMember, transferOwner, saveHubSettings, setHubActive, createInvite,
} from './api.js';

// The members list (everyone sees it) and the owner's controls (only the owner sees them).
// Hiding buttons is for tidiness only: the server checks the owner role on every request.
const me = (await getMe()).data;
const isOwner = me?.member?.role === 'owner';

const list = document.querySelector('#member-list');
const error = document.querySelector('#hub-error');

// Ask first, do it, then reload so every part of the page shows the new state
async function act(question, action) {
    if (!confirm(question)) return;
    const result = await action();
    if (result.ok) location.reload();
    else error.textContent = result.data?.error || 'Something went wrong. Try again.';
}

function button(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
}

async function loadMembers() {
    const { ok, data } = await getMembers();
    if (!ok) {
        list.textContent = data?.deactivated ? '' : "Couldn't load members.";
        return;
    }
    list.replaceChildren();
    for (const m of data) {
        const name = m.name ?? '(choosing a name)';
        const tags = [
            m.role === 'owner' && 'owner',
            m.isBanned && 'banned',
            m.id === me?.member?.id && 'you',
        ].filter(Boolean);

        const item = document.createElement('li');
        item.append(tags.length ? `${name} (${tags.join(', ')}) ` : `${name} `);

        if (isOwner && m.id !== me.member.id) {
            if (m.isBanned) {
                item.append(button('Unban', () =>
                    act(`Unban ${name}? They can join again with a new invite link.`,
                        () => removeMember(m.id))));
            } else {
                item.append(
                    button('Remove', () =>
                        act(`Remove ${name}? Their calendars are removed too. They can join again with a new invite link.`,
                            () => removeMember(m.id))),
                    ' ',
                    button('Ban', () =>
                        act(`Ban ${name}? Their calendars are removed and invite links won't let them back in.`,
                            () => banMember(m.id))),
                );
                if (m.name) {
                    item.append(' ', button('Make owner', () =>
                        act(`Make ${name} the owner? You become a regular member.`,
                            () => transferOwner(m.id))));
                }
            }
        }
        list.append(item);
    }
}

// ---- Owner-only: invite links ----
const inviteLink = document.querySelector('#invite-link');
document.querySelector('#invite-button').addEventListener('click', async () => {
    const result = await createInvite();
    if (!result.ok) {
        error.textContent = result.data?.error || 'Could not create an invite link.';
        return;
    }
    inviteLink.value = `${location.origin}/invite/${result.data.token}`;
    document.querySelector('#invite-result').hidden = false;
    inviteLink.select();
});
document.querySelector('#invite-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(inviteLink.value);
});

// ---- Owner-only hub settings ----
document.querySelector('#hub-deactivated').hidden = me?.active !== false;
document.querySelector('#owner-settings').hidden = !isOwner;

const modeSelect = document.querySelector('#shortcut-mode');
modeSelect.value = me?.shortcutMode ?? 'shared';
modeSelect.addEventListener('change', async () => {
    const result = await saveHubSettings({ shortcutMode: modeSelect.value });
    if (result.ok) location.reload();
    else error.textContent = result.data?.error || 'Could not save.';
});

const activeButton = document.querySelector('#hub-active-button');
activeButton.textContent = me?.active === false ? 'Reactivate hub' : 'Deactivate hub';
activeButton.addEventListener('click', () => (me.active
    ? act('Deactivate this hub? Nobody can see calendars or shortcuts until you reactivate it.',
        () => setHubActive(false))
    : act('Reactivate this hub?', () => setHubActive(true))));

loadMembers();
