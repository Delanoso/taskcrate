# TaskCrate production deploy (`taskcrate.co.za`)

Hosted on the HostAfrica VPS **alongside** existing apps (Safety System, Clickbot, Spikescope, GolfPro). It does **not** take over the whole server.

## Layout on the VPS

| App | How it runs | Public entry |
| --- | --- | --- |
| **TaskCrate** | PM2 `taskcrate` → `127.0.0.1:3847` | `taskcrate.co.za` via nginx `:80`/`:443` |
| Online Safety Solutions | Docker → `127.0.0.1:8080` | `onlinesafetysolutions.co.za` via nginx |
| Clickbot | PM2 → nginx `:8790` | unchanged |
| Spikescope | PM2 → nginx `:8791` | unchanged |
| GolfPro | Docker `:8080` host `8087` | unchanged |

App path: `/opt/taskcrate`  
DB: `/opt/taskcrate/prisma/production.db`  
Process: `pm2 restart taskcrate`

## Current public URL (use this)

**https://taskcrate.co.za**

HTTPS hostname on this VPS (Safari-safe cookies). Prefer this over the raw IP `:8850` link.

## DNS for taskcrate.co.za

Right now `taskcrate.co.za` points to **102.218.215.41** (not this VPS).  
In HostAfrica → **DNS Management**, set both A records to the VPS:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `169.239.181.217` |
| A | `www` | `169.239.181.217` |

Then on the VPS:

```bash
certbot --nginx -d taskcrate.co.za -d www.taskcrate.co.za
# and set NEXT_PUBLIC_APP_URL=https://taskcrate.co.za in /opt/taskcrate/.env
pm2 restart taskcrate --update-env
```

## Update the app from this repo

On a machine that can SSH to the VPS:

```bash
./scripts/deploy-vps.sh
```

Or manually:

```bash
tar --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude='*.db-journal' --exclude=dev.db --exclude=public/uploads \
  -czf /tmp/taskcrate-src.tar.gz -C . .
scp /tmp/taskcrate-src.tar.gz root@169.239.181.217:/opt/taskcrate-backups/
ssh root@169.239.181.217 '/opt/taskcrate/update-from-tarball.sh'
```

## Useful PM2 commands

```bash
pm2 ls
pm2 logs taskcrate
pm2 restart taskcrate
```
