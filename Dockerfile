# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim AS production
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV SERVE_FRONTEND=true
ENV FRONTEND_DIST_PATH=./frontend/dist

# DigitalOcean App Platform (and others) set PORT at runtime — default 8000 for local/docker-compose
EXPOSE 8000

CMD sh -c "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --ws-ping-interval 30 --ws-ping-timeout 120"
