import sql from 'db.js'

const shortcutCont = document.getElementById('shortcut-container');

async function getUsers() {
    const users = await sql`
        select id, email
        from users;
    `;
    return users;
}
console.log(getUsers);

function createShortcuts() {
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