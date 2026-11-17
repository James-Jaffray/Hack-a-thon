export async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

export const getMe = () => api('/api/auth/me');
export const signup = (email, password, name) => api('/api/auth/signup', { method: 'POST', body: { email, password, name } });
export const login = (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } });
export const logout = () => api('/api/auth/logout', { method: 'POST' });
// The invite link this browser opened: { hubName } (null if none)
export const getInvite = () => api('/api/auth/invite');
export const acceptInvite = () => api('/api/auth/invite/accept', { method: 'POST' });
export const createHub = (name) => api('/api/hub', { method: 'POST', body: { name } });
export const switchHub = (hubId) => api('/api/hub/switch', { method: 'POST', body: { hubId } });
// -> { token, expiresAt }; the link to share is `${location.origin}/invite/${token}`
export const createInvite = () => api('/api/hub/invites', { method: 'POST' });
export const setMemberName = (name) => api('/api/members/me', { method: 'PUT', body: { name } });
export const getMembers = () => api('/api/hub/members');
export const removeMember = (id) => api(`/api/hub/members/${id}`, { method: 'DELETE' });
export const banMember = (id) => api(`/api/hub/members/${id}/ban`, { method: 'POST' });
export const transferOwner = (memberId) => api('/api/hub/transfer', { method: 'POST', body: { memberId } });
// changes = { shortcutMode } and/or { settings: { isTempToggled: false } }
export const saveHubSettings = (changes) => api('/api/hub/settings', { method: 'PUT', body: changes });
export const setHubActive = (active) => api('/api/hub/active', { method: 'POST', body: { active } });
export const getEvents =(from, to) => api(`/api/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export const getShortcuts = () => api('/api/shortcuts');
export const saveShortcut = (position, label, url) => api(`/api/shortcuts/${position}`, { method: 'PUT', body: { label, url } });
export const deleteShortcut = (position) => api(`/api/shortcuts/${position}`, { method: 'DELETE' });
export const getConnections = () => api('/api/connections');
export const deleteConnection = (id) => api(`/api/connections/${id}`, { method: 'DELETE' });
export const updateConnection = (id, isEnabled) =>
    api(`/api/connections/${id}`, {
        method: 'PATCH',
        body: { isEnabled }
    });
export const addApple = (icsUrl, displayName) =>
    api('/api/connections/apple', { method: 'POST', body: { icsUrl, displayName } });

export const getCalendars = (connectionId) => api(`/api/connections/${connectionId}/calendars`);
export const saveCalendars = (connectionId, enabledIds) =>
    api(`/api/connections/${connectionId}/calendars`, { method: 'PUT', body: { enabledIds } });