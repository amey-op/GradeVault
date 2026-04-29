const SemesterView = () => {
    const { id } = useParams();
    const { semesters, loadData } = useContext(DataContext);
    const navigate = useNavigate();
    
    const sem = semesters.find(s => s.id == id);
    
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ course_name: '', course_code: '', credits: '', grade: '' });
    const [semNameForm, setSemNameForm] = useState('');
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', onConfirm: null, isAlert: false });
    
    useEffect(() => {
        if (sem) setSemNameForm(sem.name);
    }, [sem]);

    if (!sem) return <div className="p-8 text-gray-400">Loading semester...</div>;

    const { sgpa, totalCredits } = getSemesterMetrics(sem.courses);

    const handleSemNameBlur = async () => {
        if (semNameForm && semNameForm !== sem.name) {
            await api.updateSemester(sem.id, { name: semNameForm });
            loadData();
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        const payload = { ...newCourse, credits: parseInt(newCourse.credits) };
        await api.createCourse(sem.id, payload);
        setShowAddCourse(false);
        setNewCourse({ course_name: '', course_code: '', credits: '', grade: '' });
        await loadData();
    };

    const handleDeleteSem = () => {
        setModalConfig({
            open: true,
            title: 'Delete Semester',
            message: 'Delete this semester and all its courses?',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, open: false }));
                await api.deleteSemester(sem.id);
                loadData();
                navigate('/');
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
                <div className="w-full sm:w-auto">
                    <input 
                        className="text-2xl sm:text-3xl font-bold w-full sm:w-auto bg-transparent outline-none border border-transparent focus:border-gray-800 rounded px-2 -ml-2 hover:bg-gray-900/50 transition-colors" 
                        value={semNameForm} 
                        onChange={e => setSemNameForm(e.target.value)} 
                        onBlur={handleSemNameBlur}
                    />
                    <div className="text-gray-400 mt-2 flex space-x-6 px-2">
                        <span>SGPA: <strong className="text-neonEmerald text-base sm:text-lg ml-1">{sgpa}</strong></span>
                        <span>Credits: <strong className="text-white ml-1">{totalCredits}</strong></span>
                    </div>
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                    <button onClick={() => setShowAddCourse(!showAddCourse)} className="flex-1 sm:flex-none bg-neonBlue hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors text-sm sm:text-base">
                        {showAddCourse ? 'Cancel' : 'Add Course'}
                    </button>
                    <button onClick={handleDeleteSem} className="flex-1 sm:flex-none bg-gray-800 hover:bg-red-900/50 text-red-500 hover:text-red-400 px-4 py-2 rounded transition-colors text-sm sm:text-base">
                        Delete
                    </button>
                </div>
            </div>

            {showAddCourse && (
                <div className="glass-panel p-6 rounded-lg border border-gray-700 animate-fade-in">
                    <h3 className="font-bold mb-4">Add New Course</h3>
                    <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Course Code</label>
                            <input required type="text" placeholder="CS101" className="w-full bg-darkBase border border-gray-700 rounded p-2 focus:border-neonBlue outline-none" value={newCourse.course_code} onChange={e => setNewCourse({...newCourse, course_code: e.target.value})} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs text-gray-400">Course Name</label>
                            <input required type="text" placeholder="Intro to Computer Science" className="w-full bg-darkBase border border-gray-700 rounded p-2 focus:border-neonBlue outline-none" value={newCourse.course_name} onChange={e => setNewCourse({...newCourse, course_name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Credits</label>
                            <input required type="number" min="1" max="6" className="w-full bg-darkBase border border-gray-700 rounded p-2 focus:border-neonBlue outline-none" value={newCourse.credits} onChange={e => setNewCourse({...newCourse, credits: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Grade (Optional)</label>
                            <select className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonBlue outline-none" value={newCourse.grade} onChange={e => setNewCourse({...newCourse, grade: e.target.value})}>
                                <option value="">N/A</option>
                                <option value="A">A (10)</option>
                                <option value="A-">A- (9)</option>
                                <option value="B">B (8)</option>
                                <option value="B-">B- (7)</option>
                                <option value="C">C (6)</option>
                                <option value="C-">C- (5)</option>
                                <option value="D">D (4)</option>
                                <option value="F">F (0)</option>
                            </select>
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                            <button type="submit" className="bg-neonBlue text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors">Save Course</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {sem.courses.map(course => {
                    const { gained, totalWeightage } = getCourseMetrics(course.assessments);
                    return (
                        <Link key={course.id} to={`/course/${course.id}`} className="block">
                            <div className="glass-panel p-6 rounded-xl hover:border-neonBlue transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-sm font-bold text-neonBlue mb-1 tracking-wider">{course.course_code}</div>
                                        <h3 className="font-bold text-lg text-white group-hover:text-neonBlue transition-colors">{course.course_name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-white">{course.grade || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{course.credits} Cr</div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-sm">
                                    <span className="text-gray-400">Weightage Gained:</span>
                                    <span className="font-medium text-white">{gained.toFixed(2)} / {totalWeightage}</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                                    <div className="bg-neonBlue h-1.5 rounded-full" style={{ width: `${Math.min(totalWeightage, 100)}%` }}></div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
                {sem.courses.length === 0 && !showAddCourse && (
                    <div className="col-span-full text-center p-12 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                        No courses added yet. Click "Add Course" to begin.
                    </div>
                )}
            </div>
            <ConfirmModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, open: false }))} />
        </div>
    );
};
