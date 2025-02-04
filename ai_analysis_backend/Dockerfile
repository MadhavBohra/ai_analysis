# Use Python base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy dependencies and install them
COPY requirements.txt .
RUN pip install --timeout=600 --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8001

# Start FastAPI server
CMD ["hypercorn", "server:app", "--bind", "0.0.0.0:8001"]