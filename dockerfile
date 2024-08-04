# Use the latest Ubuntu image
FROM ubuntu:latest

# Install system packages
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y \
    libkrb5-dev \
    libx11-dev \
    libxkbfile-dev \
    pkg-config \
    libsecret-1-dev \
    curl \
    git \
    build-essential \
    python3

# Install NVM (Node Version Manager) and Node.js
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 20.16.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION && \
    nvm alias default $NODE_VERSION

ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Clone the VS Code repository
WORKDIR /vscode
RUN git clone https://github.com/microsoft/vscode.git --branch=1.92.0 .

# Fetch all tags and checkout the specific tag
RUN git fetch --all --tags --prune
RUN git checkout tags/1.92.0

# Enable yarn using Corepack
RUN corepack enable yarn

# Clear Yarn cache
RUN yarn cache clean

# Install node-gyp globally
RUN npm install -g node-gyp@latest

# Debugging: List files to ensure package.json is present
RUN ls -la

# Check Node.js and npm versions
RUN node -v
RUN npm -v

# Install Node.js dependencies with verbose logging
RUN yarn install --verbose

# Add "quality": "stable" to product.json
RUN sed -i '/"quality"/c\  "quality": "stable",' product.json

# Build VS Code
RUN yarn gulp vscode-reh-web-linux-x64-min

# Set the entrypoint
ENTRYPOINT ["./bin/runcode", "--default-folder", "/workspace"]

# Expose port 8000
EXPOSE 8000
