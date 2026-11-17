export function getDate() {
    document.getElementById('date').textContent =
        new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function updateClock() {
    const today = new Date();
    document.getElementById('time').textContent = `${today.getHours()}:${checkTime(today.getMinutes())}`;
    setTimeout(updateClock, 1000)
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};
  return i;
}