const CourseView = () => {
    const { id } = useParams();
    const { semesters, loadData } = useContext(DataContext);
    const navigate = useNavigate();

    // Find course across all semesters
    let course = null;
    let parentSem = null;
    for (let s of semesters) {
        const c = s.courses.find(c => c.id == id);
        if (c) {
            course = c;
            parentSem = s;
            break;
        }
    }

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    // Load formData from sessionStorage or use default
    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem(`assessment_form_${id}`);
        if (saved) return JSON.parse(saved);
        return { category: 'Quiz', name: '', weightage: '', marks_obtained: '', max_marks: '', average_marks: '' };
    });

    // Save formData to sessionStorage whenever it changes, if not editing an existing one
    useEffect(() => {
        if (!editingId && (formData.name || formData.weightage || formData.marks_obtained || formData.max_marks)) {
            sessionStorage.setItem(`assessment_form_${id}`, JSON.stringify(formData));
        }
    }, [formData, id, editingId]);

    const [showGradeDropdown, setShowGradeDropdown] = useState(false);
    const GRADES = ["N/A", "A", "A-", "B", "B-", "C", "C-", "D", "F"];

    const [courseFormData, setCourseFormData] = useState({ course_name: '', course_code: '', credits: '' });
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', onConfirm: null, isAlert: false });

    useEffect(() => {
        if (course) {
            setCourseFormData({ course_name: course.course_name, course_code: course.course_code, credits: course.credits });
        }
    }, [course]);

    const handleCourseChange = (field, value) => {
        setCourseFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCourseBlur = async () => {
        await api.updateCourse(course.id, { ...course, ...courseFormData });
        loadData();
    };

    if (!course) return <div className="p-8 text-gray-400">Loading course...</div>;

    const { gained, lost, deviation, totalWeightage } = getCourseMetrics(course.assessments);

    const groupedAssessments = {};
    course.assessments.forEach(ass => {
        if (!groupedAssessments[ass.category]) {
            groupedAssessments[ass.category] = [];
        }
        groupedAssessments[ass.category].push(ass);
    });
    const categories = Object.keys(groupedAssessments).sort();

    const radarData = useMemo(() => {
        const catStats = {};
        course.assessments.forEach(ass => {
            if (!catStats[ass.category]) catStats[ass.category] = { gained: 0, total: 0 };
            catStats[ass.category].gained += (ass.marks_obtained / ass.max_marks) * ass.weightage;
            catStats[ass.category].total += ass.weightage;
        });
        const labels = Object.keys(catStats);
        const data = labels.map(cat => catStats[cat].total > 0 ? (catStats[cat].gained / catStats[cat].total) * 100 : 0);
        
        return {
            labels,
            datasets: [{
                label: 'Performance %',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6',
            }]
        };
    }, [course]);
    
    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                pointLabels: { color: '#9ca3af', font: { family: 'Outfit', size: 12 } },
                ticks: { backdropColor: 'transparent', color: '#6b7280', min: 0, max: 100, stepSize: 20 }
            }
        },
        plugins: { legend: { display: false } }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        let currentWeightage = 0;
        course.assessments.forEach(a => {
            if (a.id !== editingId) currentWeightage += a.weightage;
        });
        if (currentWeightage + parseFloat(formData.weightage) > 100) {
            setModalConfig({
                open: true,
                title: 'Weightage Exceeded',
                message: `Total weightage cannot exceed 100%. Current: ${currentWeightage}%, Adding: ${formData.weightage}%`,
                isAlert: true,
                confirmText: 'OK',
                onConfirm: () => setModalConfig(prev => ({ ...prev, open: false }))
            });
            return;
        }

        const payload = {
            ...formData,
            weightage: parseFloat(formData.weightage),
            marks_obtained: parseFloat(formData.marks_obtained),
            max_marks: parseFloat(formData.max_marks),
            average_marks: formData.average_marks === "" ? null : parseFloat(formData.average_marks)
        };

        if (editingId) {
            await api.updateAssessment(editingId, payload);
        } else {
            await api.createAssessment(course.id, payload);
        }
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ category: 'Quiz', name: '', weightage: '', marks_obtained: '', max_marks: '', average_marks: '' });
        sessionStorage.removeItem(`assessment_form_${id}`);
        await loadData();
    };

    const handleDeleteCourse = () => {
        setModalConfig({
            open: true,
            title: 'Delete Course',
            message: 'Delete this course and all assessments?',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, open: false }));
                await api.deleteCourse(course.id);
                loadData();
                navigate(`/semester/${parentSem.id}`);
            }
        });
    };

    const handleDeleteAssessment = (assId) => {
        setModalConfig({
            open: true,
            title: 'Delete Assessment',
            message: 'Delete this assessment?',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, open: false }));
                await api.deleteAssessment(assId);
                loadData();
            }
        });
    };

    const editAssessment = (ass) => {
        setFormData({
            category: ass.category,
            name: ass.name,
            weightage: ass.weightage ?? '',
            marks_obtained: ass.marks_obtained ?? '',
            max_marks: ass.max_marks ?? '',
            average_marks: ass.average_marks ?? ''
        });
        setEditingId(ass.id);
        setShowAddModal(true);
    };

    const cancelAddModal = () => {
        setShowAddModal(false); 
        setEditingId(null);
        // Only clear if we were editing, otherwise we might want to keep the draft
        if (editingId) {
            setFormData({ category: 'Quiz', name: '', weightage: '', marks_obtained: '', max_marks: '', average_marks: '' });
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-gray-800 gap-6">
                <div className="flex-1 w-full md:w-auto mr-0 md:mr-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center md:space-x-3 space-y-2 md:space-y-0 mb-2">
                        <input 
                            className="bg-gray-800 text-neonBlue px-2 py-1 rounded text-xs font-bold tracking-wider outline-none w-20 border border-transparent focus:border-gray-600 hover:bg-gray-700 transition-colors" 
                            value={courseFormData.course_code} 
                            onChange={e => handleCourseChange('course_code', e.target.value)} 
                            onBlur={handleCourseBlur}
                        />
                        <div className="flex items-center text-gray-500 text-sm">
                            <input 
                                type="number" 
                                min="1" max="6" 
                                className="bg-transparent text-gray-500 w-8 outline-none border border-transparent focus:border-gray-600 hover:bg-gray-800 rounded px-1 text-center transition-colors" 
                                value={courseFormData.credits} 
                                onChange={e => handleCourseChange('credits', e.target.value)} 
                                onBlur={handleCourseBlur}
                            />
                            <span className="ml-1">Credits</span>
                        </div>
                    </div>
                    <input 
                        className="text-2xl sm:text-3xl font-bold text-white bg-transparent outline-none w-full border border-transparent focus:border-gray-800 rounded px-2 -ml-2 hover:bg-gray-900/50 transition-colors" 
                        value={courseFormData.course_name} 
                        onChange={e => handleCourseChange('course_name', e.target.value)} 
                        onBlur={handleCourseBlur}
                    />
                </div>
                <div className="flex items-center justify-between w-full md:w-auto space-x-4">
                    <div className="relative">
                        <div 
                            onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                            className="text-center bg-gray-900 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border border-gray-800 hover:border-neonEmerald cursor-pointer transition-all flex flex-col items-center justify-center min-w-[100px] sm:min-w-[120px] shadow-lg group"
                        >
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 group-hover:text-gray-400">Grade</div>
                            <div className="text-4xl sm:text-5xl font-black text-neonEmerald" style={{ fontFamily: "'Tanker', sans-serif" }}>
                                {course.grade || 'N/A'}
                            </div>
                        </div>

                        {showGradeDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowGradeDropdown(false)}></div>
                                <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-2 z-50 w-64 animate-fade-in">
                                    {GRADES.map(g => (
                                        <button
                                            key={g}
                                            onClick={async () => {
                                                await api.updateCourse(course.id, { ...course, grade: g === "N/A" ? null : g });
                                                setShowGradeDropdown(false);
                                                await loadData();
                                            }}
                                            className={`py-3 rounded-lg text-2xl font-black hover:bg-gray-800 transition-colors ${course.grade === g || (!course.grade && g === 'N/A') ? 'bg-neonEmerald/20 text-neonEmerald border border-neonEmerald/50' : 'text-gray-300 border border-transparent'}`}
                                            style={{ fontFamily: "'Tanker', sans-serif" }}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <button onClick={() => setShowAddModal(true)} className="bg-neonBlue hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-colors">
                            Add Assessment
                        </button>
                        <button onClick={handleDeleteCourse} className="text-gray-500 hover:text-red-500 text-xs sm:text-sm transition-colors text-right">
                            Delete Course
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded border-l-2 border-l-neonEmerald">
                    <div className="text-xs text-gray-400 mb-1">Weightage Gained</div>
                    <div className="text-2xl font-bold text-white">{gained.toFixed(2)}</div>
                </div>
                <div className="glass-panel p-4 rounded border-l-2 border-l-neonRed">
                    <div className="text-xs text-gray-400 mb-1">Weightage Lost</div>
                    <div className="text-2xl font-bold text-white">{lost.toFixed(2)}</div>
                </div>
                <div className="glass-panel p-4 rounded border-l-2 border-l-purple-500">
                    <div className="text-xs text-gray-400 mb-1">Deviation from Avg</div>
                    <div className={`text-2xl font-bold ${deviation > 0 ? 'text-neonEmerald' : deviation < 0 ? 'text-neonRed' : 'text-white'}`}>
                        {deviation > 0 ? '+' : ''}{deviation.toFixed(2)}
                    </div>
                </div>
                <div className="glass-panel p-4 rounded border-l-2 border-l-neonBlue">
                    <div className="text-xs text-gray-400 mb-1">Total Weightage Evaluated</div>
                    <div className="text-2xl font-bold text-white">{totalWeightage.toFixed(2)} <span className="text-sm text-gray-500 font-normal">/ 100</span></div>
                </div>
            </div>

            {/* Radar Chart */}
            {course.assessments.length > 0 && (
                <div className="glass-panel p-6 rounded-xl border border-gray-800 mt-6 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-full md:w-1/3">
                        <h2 className="text-xl font-bold mb-2 text-neonBlue">Strengths Radar</h2>
                        <p className="text-sm text-gray-500">Visualizes your relative performance across different assessment categories.</p>
                    </div>
                    <div className="w-full md:w-2/3 h-96 flex justify-center">
                        <div className="w-full h-full max-w-lg">
                            <Graph type="radar" data={radarData} options={radarOptions} />
                        </div>
                    </div>
                </div>
            )}

            {/* Assessments Table */}
            <div className="glass-panel rounded-xl overflow-hidden border border-gray-800 mt-8 overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px] hidden md:table">
                    <thead>
                        <tr className="bg-gray-900 border-b border-gray-800">
                            <th className="p-4 font-semibold text-gray-400 text-sm">Category</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm">Name</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Marks</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Avg</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Weightage</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Gained</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Lost</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-right">Deviation</th>
                            <th className="p-4 font-semibold text-gray-400 text-sm text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(category => (
                            <React.Fragment key={category}>
                                {groupedAssessments[category].map(ass => {
                                    const hasAvg = ass.average_marks !== null && ass.average_marks !== "";
                                    const assGained = (ass.marks_obtained / ass.max_marks) * ass.weightage;
                                    const assAvgGained = hasAvg ? (ass.average_marks / ass.max_marks) * ass.weightage : 0;
                                    const assLost = ass.weightage - assGained;
                                    const assDeviation = hasAvg ? assGained - assAvgGained : null;
                                    return (
                                        <tr key={ass.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700">{ass.category}</span>
                                            </td>
                                            <td className="p-4 font-medium">{ass.name}</td>
                                            <td className="p-4 text-right"><span className="text-white font-medium">{ass.marks_obtained}</span> <span className="text-gray-500 text-sm">/ {ass.max_marks}</span></td>
                                            <td className="p-4 text-right text-gray-400">{hasAvg ? ass.average_marks : '-'}</td>
                                            <td className="p-4 text-right font-medium text-neonBlue">{ass.weightage}%</td>
                                            <td className="p-4 text-right font-bold text-neonEmerald">{assGained.toFixed(2)}</td>
                                            <td className="p-4 text-right font-bold text-neonRed">{assLost.toFixed(2)}</td>
                                            <td className="p-4 text-right font-bold text-purple-400">
                                                {assDeviation !== null ? (assDeviation > 0 ? '+' : '') + assDeviation.toFixed(2) : '-'}
                                            </td>
                                            <td className="p-4 flex items-center justify-center space-x-4">
                                                <button onClick={() => editAssessment(ass)} className="border border-gray-600 rounded-lg px-6 py-2 text-gray-300 hover:text-white hover:border-white transition-all text-sm font-semibold">Edit</button>
                                                <button onClick={() => handleDeleteAssessment(ass.id)} className="border border-red-900/50 rounded-lg px-6 py-2 text-red-500/80 hover:text-red-400 hover:border-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center">
                                                    <Icons.Trash />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                        {course.assessments.length === 0 && (
                            <tr>
                                <td colSpan="9" className="p-8 text-center text-gray-500">No assessments recorded yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col p-4 space-y-4">
                    {categories.map(category => (
                        <React.Fragment key={category}>
                            {groupedAssessments[category].map(ass => {
                                const hasAvg = ass.average_marks !== null && ass.average_marks !== "";
                                const assGained = (ass.marks_obtained / ass.max_marks) * ass.weightage;
                                const assAvgGained = hasAvg ? (ass.average_marks / ass.max_marks) * ass.weightage : 0;
                                const assLost = ass.weightage - assGained;
                                const assDeviation = hasAvg ? assGained - assAvgGained : null;
                                return (
                                    <div key={ass.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="px-2 py-1 bg-gray-900 text-gray-300 text-[10px] rounded border border-gray-700 uppercase">{ass.category}</span>
                                                <div className="font-bold text-white mt-1">{ass.name}</div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button onClick={() => editAssessment(ass)} className="text-gray-400 hover:text-white p-1 text-sm border border-gray-700 rounded px-2">Edit</button>
                                                <button onClick={() => handleDeleteAssessment(ass.id)} className="text-red-500 hover:text-red-400 p-1 border border-red-900/50 rounded px-2"><Icons.Trash /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                            <div><span className="text-gray-500">Marks:</span> <span className="text-white font-medium">{ass.marks_obtained}</span><span className="text-gray-500 text-xs">/{ass.max_marks}</span></div>
                                            <div><span className="text-gray-500">Weightage:</span> <span className="text-neonBlue font-medium">{ass.weightage}%</span></div>
                                            <div><span className="text-gray-500">Gained:</span> <span className="text-neonEmerald font-bold">{assGained.toFixed(2)}</span></div>
                                            <div><span className="text-gray-500">Deviation:</span> <span className="text-purple-400 font-bold">{assDeviation !== null ? (assDeviation > 0 ? '+' : '') + assDeviation.toFixed(2) : '-'}</span></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </React.Fragment>
                    ))}
                    {course.assessments.length === 0 && (
                        <div className="text-center p-4 text-gray-500">No assessments recorded yet.</div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-panel w-full max-w-md rounded-xl p-6 border border-gray-700 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit' : 'Add'} Assessment</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                                    <select className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option>Quiz</option>
                                        <option>Midsem</option>
                                        <option>Endsem</option>
                                        <option>Lab</option>
                                        <option>Assignment</option>
                                        <option>Project</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Assessment Name</label>
                                    <input required type="text" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Lab 1" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Overall Weightage (%)</label>
                                <input required type="number" step="0.1" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.weightage} onChange={e => setFormData({...formData, weightage: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Max Marks</label>
                                    <input required type="number" step="0.5" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Marks Obtained</label>
                                    <input required type="number" step="0.5" max={formData.max_marks} className="w-full bg-darkBase border border-gray-700 rounded p-2 text-neonEmerald font-bold focus:border-neonEmerald outline-none" value={formData.marks_obtained} onChange={e => setFormData({...formData, marks_obtained: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Class Avg (Opt.)</label>
                                    <input type="number" step="0.5" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-gray-400 focus:border-neonEmerald outline-none" value={formData.average_marks} onChange={e => setFormData({...formData, average_marks: e.target.value})} />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-800">
                                <button type="button" onClick={cancelAddModal} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="bg-neonEmerald hover:bg-emerald-500 text-black font-bold px-6 py-2 rounded transition-colors">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, open: false }))} />
        </div>
    );
};
