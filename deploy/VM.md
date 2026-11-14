# Deploy the backend to a Google Cloud VM

The backend runs in Docker on one Compute Engine VM. Caddy sits in front of it and gets a free HTTPS certificate from Let's Encrypt. No domain is needed: `sslip.io` turns the VM's IP into a hostname (`34.12.56.78` → `34-12-56-78.sslip.io`).

The frontend stays on Firebase Hosting (`https://unspoken-line.web.app`) and calls the VM over HTTPS.

## 1. Create the VM (once)

Run these from a machine with `gcloud` installed and logged in to the `unspoken-line` project.

```bash
gcloud config set project unspoken-line

gcloud compute addresses create unspoken-line-ip --region us-central1

gcloud compute instances create unspoken-line-api \
  --zone us-central1-a --machine-type e2-small \
  --image-family debian-12 --image-project debian-cloud \
  --address unspoken-line-ip --tags unspoken-web

gcloud compute firewall-rules create unspoken-allow-web \
  --allow tcp:80,tcp:443 --target-tags unspoken-web

gcloud compute addresses describe unspoken-line-ip --region us-central1 --format='value(address)'
```

The last command prints the static IP, for example `34.12.56.78`. Your API host is that IP with dashes plus `.sslip.io`: `34-12-56-78.sslip.io`.

## 2. Install Docker and start the backend

```bash
gcloud compute ssh unspoken-line-api --zone us-central1-a

# on the VM
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

git clone https://github.com/go2bharadwaj/Unspoken-Line.git
cd Unspoken-Line
```

The repo is private, so `git clone` asks for credentials. Use a GitHub personal access token with read access to this repo as the password.

Create the two env files on the VM. They never go in git.

```bash
echo "API_HOST=34-12-56-78.sslip.io" > .env        # your IP, dashed

cp backend/.env.example backend/.env
nano backend/.env
#   GEMINI_API_KEY=<your key>
#   ALLOWED_ORIGINS=https://unspoken-line.web.app,https://unspoken-line.firebaseapp.com

docker compose up -d --build
```

Check it (the first request can take ~20 s while Caddy gets the certificate):

```bash
curl https://34-12-56-78.sslip.io/api/v1/health
# {"status":"ok","gemini_configured":true,"jev_configured":false}
```

## 3. Point the frontend at the VM and deploy it

On your laptop, in `frontend/.env`:

```
VITE_API_URL=https://34-12-56-78.sslip.io
```

Then:

```bash
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

## Updating the backend

```bash
gcloud compute ssh unspoken-line-api --zone us-central1-a
cd Unspoken-Line && git pull && docker compose up -d --build
```

## Notes

- Keep the IP static (step 1). If it changes, the sslip.io hostname changes too, and you must update `.env` on the VM and `VITE_API_URL`, then redeploy hosting.
- The VM bills around the clock. `e2-small` is about $13/month; `e2-micro` is free-tier eligible but has only 1 GB RAM.
- Logs: `docker compose logs -f api`.
