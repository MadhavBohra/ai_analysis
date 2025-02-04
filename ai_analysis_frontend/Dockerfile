# Use official Node.js image as the base image
FROM node:22-alpine


# Note to self
# Docker doesn't install the Image like whole kernel
# it just takes the base machine's kernel
# and then installs the dependencies and packages
#If your host OS is Windows/macOS, Docker runs a lightweight Linux VM in the background (because containers need a Linux kernel).


# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install all the dependencies
# this command would be re-executed
# only if the package.json or package-lock.json changes
RUN npm install


# Copy rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port on Docker container
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]