import { getShortcuts, saveShortcut } from "./api.js";


const submit = document.getElementById('submit-shortcut');

async function createShortcut() {
    const labelText = document.getElementById('shortcut-label');
    const linkText = document.getElementById('shortcut-link');
    const result = await getShortcuts();
    if (!result.ok || !result.data) {
        alert("somethings wrong");
        return;
    }
    const res = await saveShortcut(result.data.length, labelText.value, linkText.value);
    if (!res.ok) {
        alert('Could not save shortcut');
    } else alert('Saved shortcut');
    labelText.value = '';
    linkText.value = '';
}

submit.addEventListener('click', createShortcut);