const getGradePoints = (grade) => {
    const mapping = { 'A': 10, 'A-': 9, 'B': 8, 'B-': 7, 'C': 6, 'C-': 5, 'D': 4, 'F': 0 };
    return mapping[grade] || 0;
};

const getCourseMetrics = (assessments) => {
    let gained = 0;
    let avgGained = 0;
    let totalWeightage = 0;
    let avgTotalWeightage = 0;
    assessments.forEach(a => {
        gained += (a.marks_obtained / a.max_marks) * a.weightage;
        totalWeightage += a.weightage;
        if (a.average_marks !== null && a.average_marks !== "") {
            avgGained += (a.average_marks / a.max_marks) * a.weightage;
            avgTotalWeightage += a.weightage;
        }
    });
    const lost = totalWeightage - gained;
    let deviation = 0;
    if (avgTotalWeightage > 0) {
        let gainedForAvg = 0;
        assessments.forEach(a => {
            if (a.average_marks !== null && a.average_marks !== "") {
                gainedForAvg += (a.marks_obtained / a.max_marks) * a.weightage;
            }
        });
        deviation = gainedForAvg - avgGained;
    }
    return { gained, lost, avgGained, deviation, totalWeightage };
};

const getSemesterMetrics = (courses) => {
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach(c => {
        if (c.grade) {
            const points = getGradePoints(c.grade);
            totalPoints += points * c.credits;
            totalCredits += c.credits;
        }
    });
    const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
    return { sgpa, totalCredits };
};

const getCGPAMetrics = (semesters) => {
    let totalPoints = 0;
    let totalCredits = 0;
    semesters.forEach(s => {
        s.courses.forEach(c => {
            if (c.grade) {
                const points = getGradePoints(c.grade);
                totalPoints += points * c.credits;
                totalCredits += c.credits;
            }
        });
    });
    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
    return { cgpa, totalCredits };
};
