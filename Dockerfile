FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    libgl1 \
    libgtk-3-0 \
    libglu1-mesa \
    libwebkit2gtk-4.0-37 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN wget -O /opt/prusa-slicer.AppImage https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404050928.AppImage \
    && chmod +x /opt/prusa-slicer.AppImage \
    && cd /opt \
    && /opt/prusa-slicer.AppImage --appimage-extract

ENV PRUSA_PATH=/opt/squashfs-root/AppRun

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /app/temp/uploads /app/temp/outputs

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
