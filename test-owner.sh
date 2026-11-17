#!/bin/bash
# Self-check for accounts / invites / owner role / shortcuts modes / ban / transfer / deactivate.
# Uses a throwaway database so the dev one is never touched. Run from the project folder (Git Bash):
#   docker run -d --name calhub-test-db -e POSTGRES_PASSWORD=testpw -e POSTGRES_DB=fresh -p 127.0.0.1:5439:5432 postgres:16
#   docker exec -i calhub-test-db psql -U postgres -d fresh -q < db/schema.sql
#   DB_PORT=5439 DB_PASS=testpw DB_NAME=fresh PORT=3099 node --env-file=.env server.js &
#   bash test-owner.sh
#   docker rm -f calhub-test-db      (when finished; also stop the test server)
B=http://localhost:3099
D=$(mktemp -d); cd "$D"
fail=0
c()    { curl -s -m 10 -H 'Content-Type: application/json' "$@"; }
code() { curl -s -m 10 -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' "$@"; }
expect() { # label, wanted, got
    if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: wanted $2 got $3"; fail=1; fi
}
has() { # label, needle, haystack
    case "$3" in *"$2"*) echo "ok   $1";; *) echo "FAIL $1: no '$2' in $3"; fail=1;; esac
}
psql() { docker exec -i calhub-test-db psql -U postgres -d fresh -qtA -c "$1"; }

R=$RANDOM
HUB="owner-test-$R"
signup() { # jar, name -> http code. Keeps whatever is already in the jar (e.g. an opened invite link)
    code -b $1.jar -c $1.jar -d "{\"email\":\"$2-$R@test.example\",\"password\":\"testpass123\",\"name\":\"$2\"}" $B/api/auth/signup
}
invite() { c -b a.jar -X POST $B/api/hub/invites | python -c "import sys,json; print(json.load(sys.stdin)['token'])"; }
open_link() { code -b $1.jar -c $1.jar $B/invite/$2; }   # what clicking the link does: 302 to the login page

# --- accounts and creating a hub
expect "signup" 201 "$(signup a Ann)"
expect "same email twice" 409 "$(signup x Ann)"
expect "bad email" 400 "$(code -d '{"email":"nope","password":"testpass123","name":"N"}' $B/api/auth/signup)"
has "new account has no hub" '"hubName":null' "$(c -b a.jar $B/api/auth/me)"
expect "no hub, no events" 403 "$(code -b a.jar $B/api/events)"
expect "not logged in" 401 "$(code $B/api/events)"
expect "create hub" 201 "$(code -b a.jar -c a.jar -d "{\"name\":\"$HUB\"}" $B/api/hub)"
ME=$(c -b a.jar $B/api/auth/me)
has "creator is owner" '"role":"owner"' "$ME"; has "me has mode" '"shortcutMode":"shared"' "$ME"; has "me active" '"active":true' "$ME"
HUBID=$(psql "SELECT id FROM hubs WHERE name='$HUB'")

# --- invites
expect "signup without invite" 201 "$(signup b Bob)"
expect "can't walk into a hub" 404 "$(code -b b.jar -c b.jar -d "{\"hubId\":$HUBID}" $B/api/hub/switch)"
expect "still no events" 403 "$(code -b b.jar $B/api/events)"
T=$(invite)
expect "token is not stored" 0 "$(psql "SELECT count(*) FROM invites WHERE token_hash='$T'")"
expect "open link while signed in" 302 "$(open_link b $T)"
has "link names the hub" "$HUB" "$(c -b b.jar $B/api/auth/invite)"
has "opening the link alone doesn't join" '"hubName":null' "$(c -b b.jar $B/api/auth/me)"
expect "accept" 200 "$(code -b b.jar -c b.jar -X POST $B/api/auth/invite/accept)"
has "joined as member" '"role":"member"' "$(c -b b.jar $B/api/auth/me)"
expect "used link is dead" 302 "$(open_link c $T)"
expect "used link says so" 404 "$(code -b c.jar -c c.jar $B/api/auth/invite)"
expect "garbage link" 302 "$(open_link x garbage)"; expect "garbage link says so" 404 "$(code -b x.jar $B/api/auth/invite)"
# The main flow: open the link signed out, create an account, land in the hub
rm -f c.jar; T=$(invite)
expect "open link signed out" 302 "$(open_link c $T)"
expect "signup with link" 201 "$(signup c Cat)"
has "landed in the hub" "\"hubName\":\"$HUB\"" "$(c -b c.jar $B/api/auth/me)"
expect "member can't invite" 403 "$(code -b b.jar -X POST $B/api/hub/invites)"
psql "UPDATE invites SET expires_at = now() - interval '1 minute'"
T=$(invite); psql "UPDATE invites SET expires_at = now() - interval '1 minute'"
open_link x $T >/dev/null; expect "expired link" 404 "$(code -b x.jar $B/api/auth/invite)"
# Same name as someone already in the hub: no display name until they choose a free one
T=$(invite); open_link d $T >/dev/null
expect "second Ann signs up" 201 "$(code -b d.jar -c d.jar -d "{\"email\":\"ann2-$R@test.example\",\"password\":\"testpass123\",\"name\":\"ann\"}" $B/api/auth/signup)"
has "name clash leaves no name" '"name":null' "$(c -b d.jar $B/api/auth/me)"
expect "can't take a used name" 409 "$(code -b d.jar -X PUT -d '{"name":"ANN"}' $B/api/members/me)"
expect "chooses a free name" 200 "$(code -b d.jar -X PUT -d '{"name":"Dan"}' $B/api/members/me)"
# Log out and back in: one hub, so straight in
c -b a.jar -c a.jar -X POST $B/api/auth/logout >/dev/null
expect "logged out" 401 "$(code -b a.jar $B/api/auth/me)"
expect "wrong password" 401 "$(code -d "{\"email\":\"Ann-$R@test.example\",\"password\":\"wrongpass1\"}" $B/api/auth/login)"
has "login enters the only hub" "\"hubId\":$HUBID" "$(c -b a.jar -c a.jar -d "{\"email\":\"Ann-$R@test.example\",\"password\":\"testpass123\"}" $B/api/auth/login)"

# --- settings: owner only
expect "member can't change settings" 403 "$(code -b b.jar -X PUT -d '{"settings":{"isTempToggled":false}}' $B/api/hub/settings)"
S=$(c -b a.jar -X PUT -d '{"settings":{"isTempToggled":false,"evil":true,"isHumidityToggled":"yes"}}' $B/api/hub/settings)
has "owner saves setting" '"isTempToggled":false' "$S"
case "$S" in *evil*|*isHumidity*) echo "FAIL unknown/non-boolean settings were stored: $S"; fail=1;; *) echo "ok   unknown settings dropped";; esac
has "everyone reads the setting" '"isTempToggled":false' "$(c -b b.jar $B/api/auth/me)"
expect "bad mode" 400 "$(code -b a.jar -X PUT -d '{"shortcutMode":"chaos"}' $B/api/hub/settings)"

# --- shortcuts, shared mode
expect "member can't edit shared" 403 "$(code -b b.jar -X PUT -d '{"label":"x","url":"https://x.test"}' $B/api/shortcuts/1)"
expect "member can't delete shared" 403 "$(code -b b.jar -X DELETE $B/api/shortcuts/1)"
expect "owner edits shared" 200 "$(code -b a.jar -X PUT -d '{"label":"Shared","url":"https://shared.test"}' $B/api/shortcuts/1)"
expect "owner overwrites same slot" 200 "$(code -b a.jar -X PUT -d '{"label":"Shared2","url":"https://shared.test"}' $B/api/shortcuts/1)"
expect "one row, not two" 1 "$(c -b b.jar $B/api/shortcuts | grep -o '"position"' | wc -l | tr -d ' ')"
has "member sees shared" 'Shared2' "$(c -b b.jar $B/api/shortcuts)"

# --- shortcuts, personal mode
has "switch to personal" '"shortcutMode":"personal"' "$(c -b a.jar -X PUT -d '{"shortcutMode":"personal"}' $B/api/hub/settings)"
expect "member starts empty" '[]' "$(c -b b.jar $B/api/shortcuts)"
expect "member edits own" 200 "$(code -b b.jar -X PUT -d '{"label":"BobOnly","url":"https://bob.test"}' $B/api/shortcuts/1)"
expect "member overwrites own" 200 "$(code -b b.jar -X PUT -d '{"label":"BobOnly2","url":"https://bob.test"}' $B/api/shortcuts/1)"
has "member sees own" 'BobOnly2' "$(c -b b.jar $B/api/shortcuts)"
case "$(c -b c.jar $B/api/shortcuts)$(c -b a.jar $B/api/shortcuts)" in *Bob*) echo "FAIL another member sees Bob's shortcuts"; fail=1;; *) echo "ok   others can't see Bob's";; esac
expect "back to shared" 200 "$(code -b a.jar -X PUT -d '{"shortcutMode":"shared"}' $B/api/hub/settings)"
has "shared set intact" 'Shared2' "$(c -b b.jar $B/api/shortcuts)"

# --- members list, remove, ban
L=$(c -b b.jar $B/api/hub/members)
has "list visible to members" '"name":"Bob"' "$L"
id() { echo "$L" | python -c "import sys,json; print([m['id'] for m in json.load(sys.stdin) if m['name']=='$1'][0])"; }
A=$(id Ann); BO=$(id Bob); C=$(id Cat)
expect "member can't remove" 403 "$(code -b b.jar -X DELETE $B/api/hub/members/$C)"
expect "member can't ban" 403 "$(code -b b.jar -X POST $B/api/hub/members/$C/ban)"
expect "member can't transfer" 403 "$(code -b b.jar -X POST -d "{\"memberId\":$BO}" $B/api/hub/transfer)"
expect "owner can't remove self" 400 "$(code -b a.jar -X DELETE $B/api/hub/members/$A)"
expect "other hub's member is 404" 404 "$(code -b a.jar -X DELETE $B/api/hub/members/999999)"
psql "INSERT INTO calendar_connections (hub_id, member_id, provider, credential, display_name, owner_name) SELECT hub_id, id, 'apple', 'https://example.com/b.ics', 'Bobcal', 'Bob' FROM members WHERE id=$BO"
has "ban" '"isBanned":true' "$(c -b a.jar -X POST $B/api/hub/members/$BO/ban)"
expect "banned calendars removed" 0 "$(psql "SELECT count(*) FROM calendar_connections WHERE member_id=$BO")"
has "banned session has no hub" '"hubName":null' "$(c -b b.jar $B/api/auth/me)"
expect "banned loses access at once" 403 "$(code -b b.jar $B/api/events)"
T=$(invite); open_link b $T >/dev/null
expect "banned can't rejoin with an invite" 410 "$(code -b b.jar -c b.jar -X POST $B/api/auth/invite/accept)"
expect "banned can't be owner" 400 "$(code -b a.jar -X POST -d "{\"memberId\":$BO}" $B/api/hub/transfer)"
expect "unban = remove" 204 "$(code -b a.jar -X DELETE $B/api/hub/members/$BO)"
open_link b $T >/dev/null
expect "can rejoin after unban" 200 "$(code -b b.jar -c b.jar -X POST $B/api/auth/invite/accept)"

# --- transfer
expect "transfer to Cat" 200 "$(code -b a.jar -X POST -d "{\"memberId\":$C}" $B/api/hub/transfer)"
has "Cat is owner" '"role":"owner"' "$(c -b c.jar $B/api/auth/me)"
has "Ann is member" '"role":"member"' "$(c -b a.jar $B/api/auth/me)"
expect "exactly one owner" 1 "$(psql "SELECT count(*) FROM members WHERE hub_id=$HUBID AND role='owner'")"
expect "old owner lost powers" 403 "$(code -b a.jar -X PUT -d '{"shortcutMode":"personal"}' $B/api/hub/settings)"

# --- a second hub: one account, two hubs, each sealed off from the other
expect "Ann creates a second hub" 201 "$(code -b a.jar -c a.jar -d '{"name":"Second"}' $B/api/hub)"
has "now looking at it" '"hubName":"Second"' "$(c -b a.jar $B/api/auth/me)"
expect "its shortcuts are its own" '[]' "$(c -b a.jar $B/api/shortcuts)"
expect "switch back" 200 "$(code -b a.jar -c a.jar -d "{\"hubId\":$HUBID}" $B/api/hub/switch)"
has "back in the first" 'Shared2' "$(c -b a.jar $B/api/shortcuts)"

# --- deactivate
expect "member can't deactivate" 403 "$(code -b a.jar -X POST -d '{"active":false}' $B/api/hub/active)"
expect "owner deactivates" 200 "$(code -b c.jar -X POST -d '{"active":false}' $B/api/hub/active)"
has "me says inactive" '"active":false' "$(c -b a.jar $B/api/auth/me)"
for path in /api/events /api/shortcuts /api/connections /api/hub/members; do
    expect "deactivated blocks $path" 403 "$(code -b a.jar $B$path)"
done
expect "deactivated blocks invites" 403 "$(code -b c.jar -X POST $B/api/hub/invites)"
expect "member can't reactivate" 403 "$(code -b a.jar -X POST -d '{"active":true}' $B/api/hub/active)"
expect "owner reactivates" 200 "$(code -b c.jar -X POST -d '{"active":true}' $B/api/hub/active)"
expect "events back" 200 "$(code -b a.jar $B/api/events)"

rm -rf "$D"
[ $fail = 0 ] && echo "ALL PASSED" || echo "SOME FAILED"
