# ITR Manager — Frontend

Next.js frontend for the ITR filing management platform..

## Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

## Docker

### Build & Push to Docker Hub

```bash
# 1. Login to Docker Hub
docker login

# 2. Build the image
docker build -t itr-platform-frontend .

# 3. Tag for Docker Hub
docker tag itr-platform-frontend omicron9009/itr-platform-frontend:latest

# 4. Push to Docker Hub
docker push omicron9009/itr-platform-frontend:latest
```

### Pull & Run (on any machine)

```bash
# Pull the image
docker pull omicron9009/itr-platform-frontend:latest

# Run it
docker run -it -p 3001:3000 --name itr-frontend omicron9009/itr-platform-frontend:latest
```

### With custom API URL - office 

```bash
docker run -it -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://192.167.201.15:8000 --name itr-frontend omicron9009/itr-platform-frontend:latest
```

### Stop & Remove

```bash
docker stop itr-frontend
docker rm itr-frontend
```

### Notes

- The frontend automatically connects to the backend at `<same-host>:8000` by default (using the browser's hostname).
- Override with `NEXT_PUBLIC_API_URL` env var if the backend is on a different host/port.
- The image uses Next.js standalone output for minimal size (~100MB).
- Exposes port `3000`.
