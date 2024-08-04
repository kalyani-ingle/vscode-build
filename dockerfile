FROM ubuntu:latest

# Install system packages
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y libkrb5-dev libx11-dev libxkbfile-dev pkg-config libsecret-1-dev curl git

# Install NVM and Node.js
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 20.16.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION && \
    nvm alias default $NODE_VERSION

ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Clone VS Code repository
WORKDIR /vscode
RUN git clone https://github.com/microsoft/vscode.git --branch=1.92.0 .

# Fetch all tags
RUN git fetch --all --tags --prune

# Checkout specific tag
RUN git checkout tags/1.92.0

# Enable yarn
RUN corepack enable yarn

# Install Node.js dependencies
RUN yarn install

# Add "quality": "stable" to product.json
RUN sed -i '/"quality"/c\  "quality": "stable",' product.json

# Build VS Code
RUN yarn && yarn gulp vscode-reh-web-linux-x64-min

# Set the entrypoint
ENTRYPOINT ["./bin/runcode", "--default-folder", "/workspace"]

# Expose port 8000
EXPOSE 8000
