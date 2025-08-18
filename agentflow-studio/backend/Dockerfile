# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the rest of the application's source code from your host to your image filesystem.
COPY . .

# Build the TypeScript source code
RUN npm run build

# Expose port 3001 to the outside world
EXPOSE 3001

# Command to run the application
CMD [ "npm", "start" ]
