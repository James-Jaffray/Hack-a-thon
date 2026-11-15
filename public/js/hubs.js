const KEY = 'calhub.hubs';

// Recent hub names on this browser, most recent first
export function getSavedHubs() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

export function saveHub(name) {
    const hubs = getSavedHubs().filter((h) => h !== name);
    hubs.unshift(name);
    try {
        localStorage.setItem(KEY, JSON.stringify(hubs.slice(0, 8)));
    } catch {
        // storage blocked: not worth failing a login over
    }
}

// Fill a <datalist> with the saved names
export function fillHubList(datalist) {
    datalist.replaceChildren(
        ...getSavedHubs().map((name) => {
            const option = document.createElement('option');
            option.value = name;
            return option;
        })
    );
}