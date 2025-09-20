# Base image with Python 3.11 + slim Linux
FROM python:3.11-slim

# Install Node.js 20 LTS and build tools
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs build-essential \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy backend files into container
COPY . /app/

# Install Python packages
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Install LibreOffice (optional, for .docx <-> PDF conversion)
RUN apt-get update && apt-get install -y libreoffice

# Install Node.js dependencies
RUN npm install

# Expose port for backend
EXPOSE 5000

# Start Node.js server
CMD ["node", "server.js"]
