# Check out https://hub.docker.com/_/node to select a new base image
FROM node:16

# Set to a non-root built-in user `node`
# USER node

# Create app directory (with user `node`)
# RUN mkdir -p /app

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=node package*.json ./

RUN npm i typescript
# RUN npm install @loopback/cli

RUN npm install
# RUN npm audit fix

# Bundle app source code
COPY --chown=node . .

RUN npm run build

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=8080

EXPOSE ${PORT}
CMD [ "node", "." ]
