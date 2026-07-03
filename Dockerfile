# Use an official Node runtime as a parent image
# Pinned to match .nvmrc (Node 18.12.0)
FROM node:18.12.0-alpine

ENV BUILD_STANDALONE true

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port that the app will run on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]