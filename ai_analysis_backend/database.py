from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv


import psycopg2
import sys


sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

# PostgreSQL connection details
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Connect to PostgreSQL default database ("postgres") to check for DB existence
admin_conn = psycopg2.connect(
    dbname="postgres",
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)
admin_conn.autocommit = True  # Allow database creation
admin_cursor = admin_conn.cursor()

# Check if "trustwise" exists
admin_cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
db_exists = admin_cursor.fetchone()

# Create the database if it doesn’t exist
if not db_exists:
    admin_cursor.execute(f"CREATE DATABASE {DB_NAME}")
    print(f"Database '{DB_NAME}' created successfully!")
else:
    print(f"Database '{DB_NAME}' already exists.")

# Close admin connection
admin_cursor.close()
admin_conn.close()

# Now connect to the newly created database
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=True)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Define Base for ORM models
Base = declarative_base()
