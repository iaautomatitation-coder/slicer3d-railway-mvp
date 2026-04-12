FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    xz-utils \
    libgl1 \
    libgtk-3-0 \
    libglu1-mesa \
    libwebkit2gtk-4.0-37 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && node --version \
    && npm --version

RUN wget -O /tmp/prusa.deb https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/prusa-slicer_2.7.4-1_amd64.deb \
    && apt-get update \
    && apt-get install -y /tmp/prusa.deb \
    && rm /tmp/prusa.deb

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/temp/uploads /app/temp/outputs

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["npm", "start"]
