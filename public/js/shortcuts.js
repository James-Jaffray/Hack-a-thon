import { getShortcuts, saveShortcut, deleteShortcut } from './api.js';

const shortcutCont = document.getElementById('shortcut-container');

export async function createShortcuts() {
    const { ok, data } = await getShortcuts();
    const errorMsg = document.createElement('p');

    if (!ok || !data) {
        errorMsg.textContent = "Couldn't load shortcuts";
        shortcutCont.append(errorMsg);
        return;
    }
    if (data.length == 0) {
        errorMsg.textContent = "No shortcuts saved on your account";
        shortcutCont.append(errorMsg);
        return;
    }

    for (const sc in data) {
        console.log(sc);
        let container = document.createElement('div');
        container.classList.add('shortcut');
        
        let link = document.createElement('a');
        link.href = "";
        let image = document.createElement('img');
        image.src = "";
        image.alt = "shortcut image";
        link.append(image);

        let name = document.createElement('p');

        container.append(link, name);

        shortcutCont.append(container);
    }
}