# Stage 1: Build the React app
FROM node:14-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to the working directory
COPY package.json  ./

# Install dependencies
RUN npm install

# Copy the .env.production file to the working directory
COPY .env.production .env

# Copy the rest of the application code to the working directory
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Serve the React app using a lightweight web server
FROM nginx:alpine

# Copy the built React app from the previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy the nginx configuration file
COPY ./nginx.conf /etc/nginx/nginx.conf

# Expose the port that the container will run on
EXPOSE 80

# Start the nginx server
CMD ["nginx", "-g", "daemon off;"]
