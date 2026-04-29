const SUPABASE_URL = "https://vuuqrbfrfccifbmzjvpu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5QDSobVY3LA6MXis7P16yw_p4TLYWqQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const api = {
    getSemesters: () => supabase.from('semesters').select('*, courses(*, assessments(*))').order('id'),
    createSemester: async (data) => {
        const { data: { session } } = await supabase.auth.getSession();
        return supabase.from('semesters').insert({ ...data, user_id: session?.user?.id }).select();
    },
    deleteSemester: (id) => supabase.from('semesters').delete().eq('id', id),
    createCourse: (semId, data) => supabase.from('courses').insert({ ...data, semester_id: semId }),
    updateCourse: (id, data) => {
        const payload = {
            course_name: data.course_name,
            course_code: data.course_code,
            credits: parseInt(data.credits, 10),
            grade: data.grade
        };
        return supabase.from('courses').update(payload).eq('id', id);
    },
    deleteCourse: (id) => supabase.from('courses').delete().eq('id', id),
    createAssessment: (courseId, data) => supabase.from('assessments').insert({ ...data, course_id: courseId }),
    updateAssessment: (id, data) => supabase.from('assessments').update(data).eq('id', id),
    deleteAssessment: (id) => supabase.from('assessments').delete().eq('id', id),
    updateSemester: (id, data) => {
        const payload = { ...data };
        delete payload.courses;
        return supabase.from('semesters').update(payload).eq('id', id);
    }
};
