from ast import Try
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import cloudinary
import os
from urllib.parse import urlparse

db_url = "mysql+pymysql://root:trang2701@localhost:3306/web_shop"

engine = create_engine(db_url, echo = True)
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "cloudinary://351689712672884:FP-pnzkVKnm4bMUWyPkytRZWPg8@doncqzfkh")

if CLOUDINARY_URL:
    parsed = urlparse(CLOUDINARY_URL)
    api_key = parsed.username
    api_secret = parsed.password
    cloud_name = parsed.hostname
    
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )
