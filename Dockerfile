# Step 1: Base image with Python 3.11 + Node.js
FROM python:3.11-slim

# Step 2: Install Node.js (v20 LTS) and build tools
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs build-essential \
    && apt-get clean

# Step 3: Set working directory
WORKDIR /app

# Step 4: Copy all backend files into container
COPY . /app/

# Step 5: Install Python packages
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Step 6: Install LibreOffice (optional, for .docx <-> PDF conversion)
RUN apt-get update && apt-get install -y libreoffice

# Step 7: Install Node.js dependencies
RUN npm install

# Step 8: Expose port (5000 for backend)
EXPOSE 5000

# Step 9: Start Node.js backend
CMD ["node", "server.js"]
