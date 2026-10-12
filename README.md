# TaskCrate (Delano Solutions micro-SaaS)

Multi-tenant H&S / HR / Ops suite — marketing site, guest checkout, and 21 working modules.

## Local development

```bash
npm install
npm run dev
```

App: [http://localhost:3847](http://localhost:3847)

## Production (HostAfrica VPS)

Live host: **taskcrate.co.za** on `169.239.181.217` (nginx + PM2).  
Runs **alongside** other apps on the same VPS (Safety System, Clickbot, Spikescope, GolfPro) via hostname / dedicated ports — see [DEPLOY.md](./DEPLOY.md).

**Live:** [https://taskcrate.co.za](https://taskcrate.co.za)

Deploy updates:

```bash
./scripts/deploy-vps.sh
```

## Sign-in (seeded owner)

- Email: `erich@delanosolutions.co.za`
