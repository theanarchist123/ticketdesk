FROM python:3.11-slim

# Install Node.js for building the React app
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Build Frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ ./
RUN npm run build

# 2. Setup Backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and the built frontend static files
COPY backend/ .
RUN cp -r /app/frontend/dist /app/backend/static

# Expose port (Railway provides PORT env variable)
ENV PORT=8000
EXPOSE 8000

# Start script to seed data and run server
CMD ["sh", "-c", "python -c 'from app.seed import seed_demo_data; seed_demo_data()' && uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
