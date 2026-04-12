FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    libgl1 \
    libgtk-3-0 \
    libglu1-mesa \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN wget -O /tmp/prusa.tar.bz2 https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404080952.tar.bz2 \
    && mkdir -p /opt/prusaslicer \
    && tar -xjf /tmp/prusa.tar.bz2 -C /opt \
    && mv /opt/PrusaSlicer-2.7.4+linux-x64-GTK3-202404080952 /opt/prusaslicer \
    && ln -s /opt/prusaslicer/prusa-slicer /usr/local/bin/prusa-slicer \
    && rm /tmp/prusa.tar.bz2

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
