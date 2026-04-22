from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Semesters ---

@app.post("/api/semesters/", response_model=schemas.Semester)
def create_semester(semester: schemas.SemesterCreate, db: Session = Depends(get_db)):
    db_semester = models.Semester(**semester.model_dump())
    db.add(db_semester)
    db.commit()
    db.refresh(db_semester)
    return db_semester

@app.get("/api/semesters/", response_model=list[schemas.Semester])
def read_semesters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    semesters = db.query(models.Semester).offset(skip).limit(limit).all()
    return semesters

@app.put("/api/semesters/{semester_id}", response_model=schemas.Semester)
def update_semester(semester_id: int, semester: schemas.SemesterCreate, db: Session = Depends(get_db)):
    db_semester = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not db_semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    for key, value in semester.model_dump().items():
        setattr(db_semester, key, value)
        
    db.commit()
    db.refresh(db_semester)
    return db_semester

@app.delete("/api/semesters/{semester_id}", response_model=schemas.Semester)
def delete_semester(semester_id: int, db: Session = Depends(get_db)):
    db_semester = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not db_semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    db.delete(db_semester)
    db.commit()
    return db_semester

# --- Courses ---

@app.post("/api/semesters/{semester_id}/courses/", response_model=schemas.Course)
def create_course(semester_id: int, course: schemas.CourseCreate, db: Session = Depends(get_db)):
    db_semester = db.query(models.Semester).filter(models.Semester.id == semester_id).first()
    if not db_semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    db_course = models.Course(**course.model_dump(), semester_id=semester_id)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@app.put("/api/courses/{course_id}", response_model=schemas.Course)
def update_course(course_id: int, course: schemas.CourseCreate, db: Session = Depends(get_db)):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    for key, value in course.model_dump().items():
        setattr(db_course, key, value)
        
    db.commit()
    db.refresh(db_course)
    return db_course

@app.delete("/api/courses/{course_id}", response_model=schemas.Course)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(db_course)
    db.commit()
    return db_course

# --- Assessments ---

@app.post("/api/courses/{course_id}/assessments/", response_model=schemas.Assessment)
def create_assessment(course_id: int, assessment: schemas.AssessmentCreate, db: Session = Depends(get_db)):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    db_assessment = models.Assessment(**assessment.model_dump(), course_id=course_id)
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

@app.put("/api/assessments/{assessment_id}", response_model=schemas.Assessment)
def update_assessment(assessment_id: int, assessment: schemas.AssessmentCreate, db: Session = Depends(get_db)):
    db_assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not db_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    for key, value in assessment.model_dump().items():
        setattr(db_assessment, key, value)
        
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

@app.delete("/api/assessments/{assessment_id}", response_model=schemas.Assessment)
def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    db_assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not db_assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(db_assessment)
    db.commit()
    return db_assessment

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=frontend_path), name="assets")

@app.get("/{full_path:path}")
def serve_react_app(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend not found"}

