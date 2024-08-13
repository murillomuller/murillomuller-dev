# Step 1: Use an official Node.js image as the base image
FROM node:18-alpine

# Step 2: Install Python and make
RUN apk add --no-cache python3 make g++

# Step 3: Set the working directory
WORKDIR /app

# Step 4: Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Step 5: Install dependencies
RUN npm install --production

# Step 6: Copy the rest of the application code
COPY . .

# Step 7: Build the React application
RUN npm run build

# Step 8: Install a static server to serve the build
RUN npm install -g serve

# Step 8: Set the command to start the static server
CMD ["serve", "-s", "build", "-l", "5003"]

# Expose port 3000 to the outside world
EXPOSE 5003
