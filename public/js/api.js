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
export const signup = (email, password) => api('/api/auth/signup', { method: 'POST', body: { email, password } });
export const login = (email, password) => api('/api/auth/login', { method: 'POST', body: { email, password } });
export const logout = () => api('/api/auth/logout', { method: 'POST' });
export const getEvents = (from, to) => api(`/api/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
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
export const addApple = (icsUrl, displayName) => api('/api/connections/apple', { method: 'POST', body: { icsUrl, displayName } });

export const getCalendars = (connectionId) => api(`/api/connections/${connectionId}/calendars`);
export const saveCalendars = (connectionId, enabledIds) =>
    api(`/api/connections/${connectionId}/calendars`, { method: 'PUT', body: { enabledIds } });