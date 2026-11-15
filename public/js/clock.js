export function getDate() {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDate();
    let date = document.getElementById('date');
    date.textContent = `${year}/${month+1}/${day}`;
}

export function updateClock() {
    const today = new Date();
    let h = today.getHours();
    let m = today.getMinutes();
    let s = today.getSeconds();
    let time = document.getElementById('time');
    time.textContent = `${h}:${checkTime(m)}:${checkTime(s)}`;
    setTimeout(updateClock, 1000)
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};
  return i;
}