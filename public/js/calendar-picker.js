import { getCalendars, saveCalendars } from './api.js';

export async function renderCalendarPicker(container, connectionId, onChange) {
    container.replaceChildren('Loading calendars...');
    const { ok, data } = await getCalendars(connectionId);
    if (!ok || !data) {
        container.textContent = data?.needsReconnect
            ? 'Reconnect Google to choose calendars.'
            : "Couldn't load calendars.";
        return;
    }

    container.replaceChildren();

    for (const cal of data) {
        const label = document.createElement('label');
        label.style.display = 'block';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = cal.enabled;
        box.dataset.id = cal.id;

        const dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 6px;';
        dot.style.background = cal.color;

        label.append(box, dot, cal.name);
        container.append(label);
    }

    const status = document.createElement('p');
    container.append(status);

    // onchange (not addEventListener) so re-rendering never stacks duplicate handlers
    container.onchange = async () => {
        const boxes = [...container.querySelectorAll('input[type=checkbox]')];
        const ids = boxes.filter(b => b.checked).map(b => b.dataset.id);

        boxes.forEach(b => { b.disabled = true; });
        status.textContent = 'Saving...';
        const res = await saveCalendars(connectionId, ids);
        boxes.forEach(b => { b.disabled = false; });

        if (res.ok) {
            status.textContent = 'Saved';
            onChange?.();
        } else {
            status.textContent = "Couldn't save. Try again.";
        }
    };
}