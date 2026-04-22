from pydantic import BaseModel, model_validator
from typing import List, Optional

class AssessmentBase(BaseModel):
    category: str
    name: str
    weightage: float
    marks_obtained: float
    max_marks: float
    average_marks: Optional[float] = None

class AssessmentCreate(AssessmentBase):
    @model_validator(mode='after')
    def check_marks(self):
        if self.marks_obtained > self.max_marks:
            raise ValueError('marks_obtained cannot exceed max_marks')
        return self

class Assessment(AssessmentBase):
    id: int
    course_id: int

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    course_name: str
    course_code: str
    credits: int
    grade: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    semester_id: int
    assessments: List[Assessment] = []

    class Config:
        from_attributes = True

class SemesterBase(BaseModel):
    name: str

class SemesterCreate(SemesterBase):
    pass

class Semester(SemesterBase):
    id: int
    courses: List[Course] = []

    class Config:
        from_attributes = True
