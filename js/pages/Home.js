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
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', customBody: null, onConfirm: null, isAlert: false });
    const [importing, setImporting] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const importModeRef = React.useRef('merge');

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/amey-op/GradeVault/contents/JSON');
                if (res.ok) {
                    const data = await res.json();
                    const parsedTemplates = [];
                    data.forEach(file => {
                        if (file.name.endsWith('.json')) {
                            const match = file.name.match(/iiit_(.*?)_template\.json/);
                            if (match && match[1]) {
                                parsedTemplates.push({
                                    name: file.name,
                                    title: match[1].toUpperCase(),
                                    url: file.download_url || `/JSON/${file.name}`
                                });
                            }
                        }
                    });
                    setTemplates(parsedTemplates);
                }
            } catch (err) {
                console.error("Failed to load templates", err);
            }
        };
        fetchTemplates();
    }, []);

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

    const processImport = async (json) => {
        let courseCount = 0;
        json.semesters.forEach(s => {
            if (s.courses) courseCount += s.courses.length;
        });

        importModeRef.current = 'merge';

        setModalConfig({
            open: true,
            title: 'Import Template',
            customBody: (
                <div className="space-y-4 mb-6">
                    <p className="text-gray-400 text-sm">
                        This will add {json.semesters.length} semesters and {courseCount} courses. How would you like to import?
                    </p>
                    <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <input type="radio" name="importMode" value="merge" defaultChecked onChange={() => importModeRef.current = 'merge'} className="mt-1 accent-neonEmerald" />
                            <div>
                                <div className="text-gray-200 text-sm font-medium group-hover:text-neonEmerald transition-colors">Merge with existing</div>
                                <div className="text-gray-500 text-xs">Appends new semesters to your current data</div>
                            </div>
                        </label>
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <input type="radio" name="importMode" value="replace" onChange={() => importModeRef.current = 'replace'} className="mt-1 accent-neonRed" />
                            <div>
                                <div className="text-gray-200 text-sm font-medium group-hover:text-neonRed transition-colors">Clear and Replace</div>
                                <div className="text-neonRed/80 text-xs font-medium">Deletes all current semesters before importing</div>
                            </div>
                        </label>
                    </div>
                </div>
            ),
            confirmText: 'Import',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, open: false }));
                setImporting(true);
                try {
                    if (importModeRef.current === 'replace') {
                        for (let s of semesters) {
                            await api.deleteSemester(s.id);
                        }
                    }

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
                    await loadData(true); // background refresh
                    setModalConfig({ open: true, title: 'Success', message: 'Template imported successfully!', isAlert: true, confirmText: 'OK', onConfirm: () => setModalConfig(prev => ({...prev, open: false})) });
                } catch (err) {
                    setModalConfig({ open: true, title: 'Error', message: "Error importing: " + err.message, isAlert: true, confirmText: 'OK', onConfirm: () => setModalConfig(prev => ({...prev, open: false})) });
                } finally {
                    setImporting(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }
        });
    };

    const handleTemplateClick = async (template) => {
        setShowImportMenu(false);
        try {
            setImporting(true);
            const res = await fetch(template.url);
            const json = await res.json();
            setImporting(false);
            processImport(json);
        } catch (err) {
            setImporting(false);
            setModalConfig({ open: true, title: 'Error', message: 'Failed to download template.', isAlert: true, confirmText: 'OK', onConfirm: () => setModalConfig(prev => ({...prev, open: false})) });
        }
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
                processImport(json);
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
                    {importing && <span className="md:ml-4 text-sm text-neonEmerald animate-pulse mt-1 md:mt-0">Processing...</span>}
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
                <div className="relative">
                    <button onClick={() => setShowImportMenu(!showImportMenu)} className="border border-gray-600 text-gray-300 hover:text-white hover:border-white px-4 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2">
                        <Icons.Plus /> <span>Import Template</span>
                        <div className="ml-1"><Icons.ChevronDown /></div>
                    </button>
                    {showImportMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowImportMenu(false)}></div>
                            <div className="absolute left-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 py-2 animate-fade-in">
                                {templates.length > 0 && (
                                    <>
                                        <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">IIIT Templates</div>
                                        {templates.map(t => (
                                            <button key={t.name} onClick={() => handleTemplateClick(t)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                                                {t.title}
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-800 my-1"></div>
                                    </>
                                )}
                                <button onClick={() => { setShowImportMenu(false); handleImportClick(); }} className="w-full text-left px-4 py-2 text-sm text-neonEmerald hover:bg-gray-800 transition-colors font-medium">
                                    Custom Local File...
                                </button>
                            </div>
                        </>
                    )}
                </div>
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
