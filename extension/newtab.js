// The one place the extension knows where CalHub lives.
const DEV = 'http://localhost:3000';
const PROD = 'https://calhub.cc';
const CALHUB_URL = DEV;   // switch to PROD once https://calhub.cc is live

window.location.replace(`${CALHUB_URL}/index.html`);
