from ast import Try
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

db_url = "mysql+pymysql://root:trang2701@localhost:3306/web_shop"

engine = create_engine(db_url, echo = True)
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()
    