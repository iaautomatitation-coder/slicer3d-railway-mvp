FROM ubuntu:22.04

# Define variables for PrusaSlicer
ENV PRUSA_URL="https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.7.4/PrusaSlicer-2.7.4+linux-x64-GTK3-202404051128.AppImage"
ENV PRUSA_DIR="/opt/prusa"
ENV PRUSA_APP="$PRUSA_DIR/prusa-slicer.AppImage"

# Install dependencies needed right away
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    fuse \
    libglu1-mesa \
    libgconf-2-4 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    xvfb \
    libosmesa6 \
    dbus \
    locales \
    && rm -rf /var/lib/apt/lists/*

# Set up Node.js directly
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Setup PrusaSlicer
RUN mkdir -p $PRUSA_DIR && \
    wget -qO $PRUSA_APP "$PRUSA_URL" && \
    chmod +x $PRUSA_APP

# Extract AppImage (required in Docker since FUSE has issues)
WORKDIR $PRUSA_DIR
RUN ./prusa-slicer.AppImage --appimage-extract

# Set environment variable so the node app finds the executable
ENV PRUSA_PATH="/opt/prusa/squashfs-root/AppRun"

# Return to App Dir
WORKDIR /app

# Copy application files
COPY package*.json ./
RUN npm install --production

# Directories for app logic
COPY src/ ./src/
COPY profiles/ ./profiles/
COPY server.js ./

# Recreate temp directories just in case they were excluded by git
RUN mkdir -p temp/uploads temp/outputs

# Expose port (Railway overrides this with $PORT)
ENV PORT=3000
EXPOSE 3000

# Start server using Xvfb for headless execution
CMD xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" node server.js
