import { getShortcuts } from './api.js';

const shortcutCont = document.getElementById('shortcut-container');

export const shortcuts = await (await fetch('../api/shortcuts')).json();

export async function renderShortcuts() {
    const result = await getShortcuts();
    const errorMsg = document.createElement('p');

    if (!result.ok || !result.data) {
        errorMsg.textContent = "Couldn't load shortcuts";
        shortcutCont.append(errorMsg);
        return;
    }
    if (result.data.length == 0) {
        errorMsg.textContent = "No shortcuts saved on your account";
        shortcutCont.append(errorMsg);
        return;
    }
    for (var i = 0; i < result.data.length; i++) {
        let container = document.createElement('div');
        container.classList.add('shortcut');
        
        let link = document.createElement('a');
        link.href = result.data[i].url;
        link.target = '_blank';
        link.setAttribute('aria-label', result.data[i].label);
        // The site's own favicon; falls back to the first letter of the label
        const letter = result.data[i].label.trim().charAt(0).toUpperCase();
        let image = document.createElement('img');
        image.alt = '';
        image.classList.add('shortcut-icon');
        image.addEventListener('error', () => image.replaceWith(letter));
        try { image.src = new URL('/favicon.ico', result.data[i].url).href; } catch { image.replaceWith(letter); }
        link.append(image);

        let name = document.createElement('p');
        name.textContent = result.data[i].label;
        container.append(link, name);

        shortcutCont.append(container);
    }
}