# Launch Phase 1: manual steps

The repo side is done (tunnel service in Compose, `/health`, `.env.example`). These are the steps only a person with the accounts can do, in order. Dashboard labels change now and then; if a menu name differs, look for the nearest match.

Rule for all of it: tokens and passwords go in the Synology's `.env` file only. Never in git, never in chat.

## 1. Cloudflare: add the domain

1. Create a free account at dash.cloudflare.com, then **Add a domain** -> `calhub.cc` -> Free plan.
2. Cloudflare shows two nameservers. At the registrar where calhub.cc was bought, replace the existing nameservers with those two.
3. Wait for the "domain is active" email (minutes to a few hours).
4. In **SSL/TLS -> Edge Certificates**, turn on **Always Use HTTPS**.

## 2. Cloudflare: create the tunnel

1. Open **Zero Trust** (it asks for a team name and the free plan the first time) -> **Networks -> Tunnels -> Create a tunnel**.
2. Connector type **Cloudflared**, name it `calhub`.
3. It shows an install command containing a long token (starts with `eyJ`). Copy only the token. Skip the install command; our Compose file runs cloudflared.
4. On the **Public Hostname** step: Domain `calhub.cc`, Subdomain empty, Service type `HTTP`, URL `app:3000`. Save.

`app:3000` works because cloudflared runs in the same Compose network as the Express container, where `app` is its hostname. Traffic between Cloudflare and the tunnel is encrypted; the last hop inside Docker is plain HTTP, which is why `server.js` has `trust proxy`.

Optional `www`: add a proxied DNS record `www` (CNAME to `calhub.cc`), then **Rules -> Redirect Rules** -> redirect `www.calhub.cc/*` to `https://calhub.cc/${1}` with 301.

## 3. Synology: run the stack

1. Install **Container Manager** from Package Center.
2. Put the repo at `/volume1/docker/calhub` (git clone over SSH, or upload the folder with File Station).
3. In that folder, copy `.env.example` to `.env` and set:

   ```
   DB_NAME=calhub
   DB_PASS=<new long random password>
   SESSION_SECRET=<new long random string, not the dev one>
   GOOGLE_CLIENT_ID=<same as dev>
   GOOGLE_CLIENT_SECRET=<same as dev>
   GOOGLE_REDIRECT_URI=https://calhub.cc/auth/google/callback
   NODE_ENV=production
   COOKIE_SECURE=true
   COMPOSE_PROFILES=tunnel
   TUNNEL_TOKEN=<token from step 2>
   ```

4. Container Manager -> **Project -> Create** -> path `/volume1/docker/calhub` -> use the existing `docker-compose.yml` -> build and start.
5. You should see three containers: `db`, `app`, `cloudflared`. If `cloudflared` is missing, the UI ignored `COMPOSE_PROFILES`; start it over SSH instead:

   ```
   cd /volume1/docker/calhub && sudo docker compose --profile tunnel up -d --build
   ```

6. Check: the tunnel shows **Healthy** in Cloudflare, and `https://calhub.cc/health` returns `{"ok":true}`.

Note: the seed data creates the demo hub (`demo@calhub.test` / `demo1234`) on a fresh database. Change or delete it before sharing the URL.

## 4. Google Cloud Console

1. **APIs & Services -> Credentials** -> open the OAuth 2.0 client.
2. Under **Authorized redirect URIs** add `https://calhub.cc/auth/google/callback`. Keep `http://localhost:3000/auth/google/callback` for dev.
3. Test: on https://calhub.cc, log in to a hub and connect a Google calendar.

## 5. Old Weather API key

`public/js/test.js` is deleted, but the key it contained is still in git history on GitHub, so treat it as leaked. The app now uses Open-Meteo, which needs no key.

1. **APIs & Services -> Credentials** -> delete that API key (it starts with `AIza`).
2. **Billing -> Budgets & alerts** -> create a budget (e.g. $1) with email alerts.

## 6. Extension

Once step 3.6 passes: in `extension/newtab.js` change `CALHUB_URL = DEV` to `PROD`, then reload the extension at `chrome://extensions`.

No `host_permissions` were added to `manifest.json`. The extension only redirects the new tab, which needs no permission, and zero permissions is stricter than `https://calhub.cc/*` (and means no permission warning in the Web Store). Add that line only if the extension later calls the API itself.

## 7. Backups

1. Create a shared folder, e.g. `backups`, with a `calhub` subfolder.
2. **Control Panel -> Task Scheduler -> Create -> Scheduled Task -> User-defined script**. User `root`, daily at 03:00, script:

   ```
   set -e
   cd /volume1/docker/calhub
   OUT=/volume1/backups/calhub
   /usr/local/bin/docker compose exec -T db pg_dump -U postgres -Fc calhub > "$OUT/calhub-$(date +%F).dump"
   find "$OUT" -name 'calhub-*.dump' -mtime +14 -delete
   ```

   In the task's settings, tick "send run details by email when the script terminates abnormally".
3. Run the task once by hand and check a non-empty `.dump` file appears.
4. **Hyper Backup** -> new task -> destination USB drive or a cloud (C2, Backblaze B2, Google Drive) -> include the `backups` shared folder -> daily, after 03:00.
5. Test restore once (over SSH, in `/volume1/docker/calhub`). It restores into a scratch database, so live data is untouched:

   ```
   sudo docker compose exec -T db createdb -U postgres restore_test
   sudo docker compose exec -T db pg_restore -U postgres -d restore_test < /volume1/backups/calhub/calhub-YYYY-MM-DD.dump
   sudo docker compose exec -T db psql -U postgres -d restore_test -c "SELECT count(*) FROM users;"
   sudo docker compose exec -T db dropdb -U postgres restore_test
   ```

## 8. Synology hygiene

- **Control Panel -> Update & Restore**: DSM up to date, automatic security updates on.
- **Personal -> Account -> 2-Factor Authentication** on for every admin account.
- Router: no port forwards to the NAS. Control Panel -> External Access: QuickConnect and DDNS off unless you really use them.
- Network isolation is already handled: Compose puts the three containers on their own network, and the app and database ports are bound to `127.0.0.1`, so nothing on the LAN or internet can reach them except through the tunnel.

## 9. Uptime monitor

uptimerobot.com (free) -> **New monitor** -> HTTP(s) -> `https://calhub.cc/health` -> every 5 minutes -> alert by email. `/health` returns 500 when the database is down, so this catches that too.
