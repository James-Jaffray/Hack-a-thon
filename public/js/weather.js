let latitude = 0;
let longitude = 0;

export function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else { 
        alert("Geolocation is not supported by this browser.");
    }
}

export function getLat() {
    return latitude;
}

function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    testCoords();
}

function error() {
    alert("Sorry, no position available.");
}

function testCoords() {
    console.log(`latitude: ${latitude}`);
    console.log(`longitude: ${longitude}`);
}