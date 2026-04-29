const Home = () => {
    const { semesters, profile } = useContext(DataContext);
    const { cgpa, totalCredits } = useMemo(() => getCGPAMetrics(semesters), [semesters]);

    const { topCourses, droppingCourses } = useMemo(() => {
        const allCourses = [];
        semesters.forEach(s => {
            s.courses.forEach(c => {
                if (c.grade) {
                    allCourses.push({ ...c, semesterName: s.name, points: getGradePoints(c.grade) });
                }
            });
        });
        const cgpaNum = parseFloat(cgpa) || 0;
        const sorted = [...allCourses].sort((a, b) => b.points - a.points);
        const top = sorted.slice(0, 3);
        const dropping = [...allCourses].filter(c => c.points < cgpaNum).sort((a, b) => a.points - b.points).slice(0, 3);
        return { topCourses: top, droppingCourses: dropping };
    }, [semesters, cgpa]);

    const sgpaData = useMemo(() => {
        return {
            labels: semesters.map(s => s.name),
            datasets: [{
                label: 'SGPA',
                data: semesters.map(s => getSemesterMetrics(s.courses).sgpa),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true
            }]
        };
    }, [semesters]);

    const sgpaOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } }
        }
    };

    const fileInputRef = React.useRef(null);
    const { loadData } = useContext(DataContext);
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', onConfirm: null, isAlert: false });
    const [importing, setImporting] = useState(false);

    const handleDownload = () => {
        const exportData = {
            template_name: "My Structure",
            semesters: semesters.map(s => ({
                name: s.name,
                courses: s.courses.map(c => ({
                    course_name: c.course_name,
                    course_code: c.course_code,
                    credits: c.credits
                }))
            }))
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "gradevault_template.json");
        dlAnchorElem.click();
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const json = JSON.parse(evt.target.result);
                if (!json.semesters || !Array.isArray(json.semesters)) throw new Error("Invalid JSON structure");
                
                let courseCount = 0;
                json.semesters.forEach(s => {
                    if (s.courses) courseCount += s.courses.length;
                });

                setModalConfig({
                    open: true,
                    title: 'Import Template',
                    message: `This will add ${json.semesters.length} semesters and ${courseCount} courses. Continue?`,
                    confirmText: 'Import',
                    onConfirm: async () => {
                        setModalConfig(prev => ({ ...prev, open: false }));
                        setImporting(true);
                        try {
                            for (let s of json.semesters) {
                                const semRes = await api.createSemester({ name: s.name });
                                if (semRes.data && semRes.data[0] && s.courses) {
                                    const semId = semRes.data[0].id;
                                    for (let c of s.courses) {
                                        await api.createCourse(semId, {
                                            course_name: c.course_name,
                                            course_code: c.course_code,
                                            credits: parseInt(c.credits) || 0
                                        });
                                    }
                                }
                            }
                            await loadData();
                        } catch (err) {
                            setModalConfig({ open: true, title: 'Error', message: "Error importing: " + err.message, isAlert: true, confirmText: 'OK', onConfirm: () => setModalConfig(prev => ({...prev, open: false})) });
                        } finally {
                            setImporting(false);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                    }
                });
            } catch (err) {
                setModalConfig({
                    open: true, title: 'Error', message: 'Invalid JSON format.', isAlert: true, confirmText: 'OK', onConfirm: () => setModalConfig(prev => ({...prev, open: false}))
                });
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const ungradedCourses = useMemo(() => {
        return semesters.flatMap(s => s.courses.filter(c => !c.grade).map(c => ({...c, semName: s.name})));
    }, [semesters]);

    const [simulatedGrades, setSimulatedGrades] = useState({});

    const simulatedCgpa = useMemo(() => {
        let totalPts = 0;
        let totalCrs = 0;
        semesters.forEach(s => {
            s.courses.forEach(c => {
                const grade = simulatedGrades[c.id] || c.grade;
                if (grade) {
                    totalPts += getGradePoints(grade) * c.credits;
                    totalCrs += c.credits;
                }
            });
        });
        return totalCrs > 0 ? (totalPts / totalCrs).toFixed(2) : cgpa;
    }, [semesters, simulatedGrades, cgpa]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold flex flex-col md:flex-row items-start md:items-center">
                    <span>Hello {profile?.username || 'User'} 👋</span>
                    {importing && <span className="md:ml-4 text-sm text-neonEmerald animate-pulse mt-1 md:mt-0">Importing...</span>}
                </h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-8 rounded-xl border-t-4 border-t-neonEmerald relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-neonEmerald/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-gray-400 font-medium mb-2">Cumulative GPA</div>
                        <div className="text-6xl font-black text-white">{cgpa}</div>
                        <div className="text-sm text-neonEmerald mt-2 tracking-wide">OUT OF 10.0</div>
                    </div>
                </div>
                
                <div className="glass-panel p-8 rounded-xl border-t-4 border-t-neonBlue relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-neonBlue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <div className="text-gray-400 font-medium mb-2">Total Credits</div>
                        <div className="text-6xl font-black text-white">{totalCredits}</div>
                        <div className="text-sm text-neonBlue mt-2 tracking-wide">EARNED</div>
                    </div>
                </div>
            </div>

            {/* SGPA Progression & Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-gray-800">
                    <h2 className="text-xl font-bold mb-4">SGPA Progression</h2>
                    {semesters.length > 0 ? (
                        <div className="h-[350px] w-full"><Graph type="line" data={sgpaData} options={sgpaOptions} /></div>
                    ) : (
                        <div className="text-sm text-gray-500">Add semesters to see progression.</div>
                    )}
                </div>
                <div className="glass-panel p-6 rounded-xl border border-gray-800 space-y-6">
                        <h2 className="text-xl font-bold mb-2 text-neonEmerald">Grade Simulator</h2>
                        {ungradedCourses.length > 0 ? (
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {ungradedCourses.map(c => (
                                    <div key={c.id} className="flex justify-between items-center text-sm border-b border-gray-800/50 pb-1">
                                        <div className="truncate text-gray-300 w-40" title={c.course_name}>{c.course_name}</div>
                                        <select className="bg-darkBase border border-gray-700 rounded p-1 text-white outline-none w-16" value={simulatedGrades[c.id] || ''} onChange={e => setSimulatedGrades({...simulatedGrades, [c.id]: e.target.value})}>
                                            <option value="">-</option>
                                            <option value="A">A</option><option value="A-">A-</option>
                                            <option value="B">B</option><option value="B-">B-</option>
                                            <option value="C">C</option><option value="C-">C-</option>
                                            <option value="D">D</option><option value="F">F</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">No ungraded courses.</div>
                        )}
                        <div className="mt-4 text-sm text-gray-400">
                            Simulated CGPA: <strong className="text-white text-2xl ml-2">{simulatedCgpa}</strong>
                        </div>
                </div>
            </div>

            {/* Top and Dropping Courses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-bold mb-4 text-neonEmerald">Top Courses</h2>
                    <div className="space-y-3">
                        {topCourses.map(c => (
                            <Link key={c.id} to={`/course/${c.id}`} className="block">
                                <div className="glass-panel p-4 rounded-lg hover:border-neonEmerald border border-transparent transition-colors flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-white text-sm">{c.course_name}</div>
                                        <div className="text-xs text-gray-500">{c.course_code} • {c.semesterName}</div>
                                    </div>
                                    <div className="text-xl font-black text-neonEmerald">{c.grade}</div>
                                </div>
                            </Link>
                        ))}
                        {topCourses.length === 0 && <div className="text-sm text-gray-500">No graded courses yet.</div>}
                    </div>
                </div>
                {droppingCourses.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-neonRed">Low Performing Courses</h2>
                        <div className="space-y-3">
                            {droppingCourses.map(c => (
                                <Link key={c.id} to={`/course/${c.id}`} className="block">
                                    <div className="glass-panel p-4 rounded-lg hover:border-neonRed border border-transparent transition-colors flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white text-sm">{c.course_name}</div>
                                            <div className="text-xs text-gray-500">{c.course_code} • {c.semesterName}</div>
                                        </div>
                                        <div className="text-xl font-black text-neonRed">{c.grade}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex space-x-4 mb-2">
                <button onClick={handleDownload} className="border border-gray-600 text-gray-300 hover:text-white hover:border-white px-4 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2">
                    <Icons.Download /> <span>Share My Structure</span>
                </button>
                <button onClick={handleImportClick} className="border border-gray-600 text-gray-300 hover:text-white hover:border-white px-4 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2">
                    <Icons.Plus /> <span>Import Template</span>
                </button>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".json" />
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">Semesters Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {semesters.map(sem => {
                        const { sgpa, totalCredits: semCredits } = getSemesterMetrics(sem.courses);
                        return (
                            <Link key={sem.id} to={`/semester/${sem.id}`} className="block">
                                <div className="glass-panel p-6 rounded-lg hover:bg-gray-800 transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-gray-800">
                                    <h3 className="font-bold text-lg mb-4 text-gray-200">{sem.name}</h3>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-sm text-gray-500">SGPA</div>
                                            <div className="text-2xl font-bold text-neonEmerald">{sgpa}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">Credits</div>
                                            <div className="text-lg font-medium text-gray-300">{semCredits}</div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {semesters.length === 0 && (
                        <div className="col-span-full text-center p-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                            No semesters added yet. Use the sidebar to add your first semester.
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, open: false }))} />
        </div>
    );
};
