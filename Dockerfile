# Use the official Node.js image
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript code
RUN npm run build

# Start the application
CMD ["node", "dist/index.js"]
