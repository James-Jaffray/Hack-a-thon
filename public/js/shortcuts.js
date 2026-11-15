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
        console.log(result.data[i].label);
        let container = document.createElement('div');
        container.classList.add('shortcut');
        
        let link = document.createElement('a');
        link.href = result.data[i].url;
        link.target = '_blank';
        let image = document.createElement('img');
        image.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQy08XR58e5GTgTHWJbenl1yXy7nmgTBJ1STzQdUiB4gQ&s=10";
        image.alt = "shortcut image";
        image.classList.add('shortcut-icon');
        link.append(image);

        let name = document.createElement('p');
        name.textContent = result.data[i].label;
        container.append(link, name);

        shortcutCont.append(container);
    }
}