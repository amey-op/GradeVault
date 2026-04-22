from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float
from sqlalchemy.orm import relationship

from database import Base

class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

    courses = relationship("Course", back_populates="semester", cascade="all, delete-orphan")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"))
    course_name = Column(String)
    course_code = Column(String)
    credits = Column(Integer)
    grade = Column(String, nullable=True)

    semester = relationship("Semester", back_populates="courses")
    assessments = relationship("Assessment", back_populates="course", cascade="all, delete-orphan")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    category = Column(String)
    name = Column(String)
    weightage = Column(Float)
    marks_obtained = Column(Float)
    max_marks = Column(Float)
    average_marks = Column(Float)

    course = relationship("Course", back_populates="assessments")
