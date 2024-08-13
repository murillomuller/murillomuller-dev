# Step 1: Use an official Node.js image as the base image
# Choose a Node.js version that your React app requires
FROM node:18-alpine

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy package.json and package-lock.json to the working directory
# This ensures Docker caches these steps unless package.json changes
COPY package.json package-lock.json ./

# Step 4: Install dependencies
RUN npm install --production

# Step 5: Copy the rest of the application code to the working directory
COPY . .

# Step 6: Build the React application
RUN npm run build

# Step 7: Serve the React app using a static server (e.g., serve)
# Install serve globally
RUN npm install -g serve

# Step 8: Set the command to start the static server
CMD ["serve", "-s", "build", "-l", "5003"]

# Expose port 3000 to the outside world
EXPOSE 5003
