const shortcutCont = document.getElementById('shortcut-container');



export function createShortcuts() {
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