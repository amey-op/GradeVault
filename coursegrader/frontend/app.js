const { useState, useEffect, useMemo, createContext, useContext } = React;
const { BrowserRouter, Routes, Route, Link, useParams, useNavigate, useLocation } = ReactRouterDOM;

// --- Supabase Client ---
const SUPABASE_URL = "https://vuuqrbfrfccifbmzjvpu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5QDSobVY3LA6MXis7P16yw_p4TLYWqQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const api = {
    getSemesters: () => supabase.from('semesters').select('*, courses(*, assessments(*))').order('id'),
    createSemester: async (data) => {
        const { data: { session } } = await supabase.auth.getSession();
        return supabase.from('semesters').insert({ ...data, user_id: session?.user?.id });
    },
    deleteSemester: (id) => supabase.from('semesters').delete().eq('id', id),
    createCourse: (semId, data) => supabase.from('courses').insert({ ...data, semester_id: semId }),
    updateCourse: (id, data) => {
        const payload = { ...data };
        delete payload.assessments;
        delete payload.semesterName;
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

// --- Calculations ---
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

// --- Contexts ---
const DataContext = createContext(null);

// --- Components ---

const Icons = {
    Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    Back: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    Github: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>,
    Linkedin: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

const Graph = ({ type, data, options }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);
    const [chartLoaded, setChartLoaded] = useState(!!window.Chart);

    useEffect(() => {
        if (!window.Chart) {
            const checkChart = setInterval(() => {
                if (window.Chart) {
                    setChartLoaded(true);
                    clearInterval(checkChart);
                }
            }, 100);
            return () => clearInterval(checkChart);
        }
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !chartLoaded) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new window.Chart(ctx, { type, data, options });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [type, data, options, chartLoaded]);

    if (!chartLoaded) return <div className="text-gray-500 text-sm flex items-center justify-center h-full">Loading chart...</div>;
    return <canvas ref={canvasRef}></canvas>;
};

const Topbar = ({ sidebarOpen, setSidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useContext(DataContext);
    return (
        <div className="h-16 border-b border-gray-800 glass-panel fixed top-0 w-full z-40 flex items-center px-4 md:px-6 justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white transition-colors flex items-center justify-center p-1 md:p-0">
                    <Icons.Menu />
                </button>
                <Link to="/" className="text-neonEmerald font-bold text-xl flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <Icons.Home />
                </Link>
                {location.pathname !== '/' && (
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1 md:space-x-2 ml-2 md:ml-4 text-sm md:text-base">
                        <Icons.Back /> <span className="hidden sm:inline">Back</span>
                    </button>
                )}
            </div>
            <div className="flex items-center space-x-4 md:space-x-6">
                {profile && (
                    <div className="text-gray-400 text-sm hidden md:block">
                        Welcome, <span className="text-white font-bold">{profile.username}</span>
                    </div>
                )}
                <div className="text-lg md:text-xl font-black tracking-wider text-white truncate">GradeVault</div>
                <button onClick={async () => await supabase.auth.signOut()} className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2 border border-gray-800 hover:border-gray-600 rounded px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm">
                    <Icons.Logout /> <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </div>
    );
};

const Sidebar = ({ isOpen }) => {
    const { semesters, loadData } = useContext(DataContext);
    const [newSemName, setNewSemName] = useState("");

    const handleAddSem = async (e) => {
        e.preventDefault();
        if (!newSemName) return;
        await api.createSemester({ name: newSemName });
        setNewSemName("");
        loadData();
    };

    return (
        <div className={`w-64 border-r border-gray-800 glass-panel fixed left-0 top-16 bottom-0 overflow-y-auto flex flex-col pt-6 transition-transform duration-300 z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-6 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Semesters</div>
            <div className="flex-1">
                {semesters.map(s => (
                    <Link key={s.id} to={`/semester/${s.id}`} className="block px-6 py-3 hover:bg-gray-800 hover:text-neonEmerald transition-colors border-l-2 border-transparent hover:border-neonEmerald text-gray-300">
                        {s.name}
                    </Link>
                ))}
            </div>
            <div className="p-4 border-t border-gray-800">
                <form onSubmit={handleAddSem} className="flex space-x-2">
                    <input 
                        type="text" 
                        value={newSemName}
                        onChange={e => setNewSemName(e.target.value)}
                        placeholder="New Semester..."
                        className="bg-darkSurface border border-gray-700 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:border-neonEmerald text-white"
                    />
                    <button type="submit" className="bg-neonEmerald text-black rounded p-1.5 hover:bg-emerald-400 transition-colors">
                        <Icons.Plus />
                    </button>
                </form>
            </div>
        </div>
    );
};

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (window.innerWidth < 768) setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex flex-col min-h-screen overflow-x-hidden">
            <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex flex-1 pt-16 relative w-full">
                {sidebarOpen && (
                    <div className="fixed inset-0 bg-black/60 z-20 md:hidden mt-16" onClick={() => setSidebarOpen(false)}></div>
                )}
                <Sidebar isOpen={sidebarOpen} />
                <div className={`transition-all duration-300 p-4 sm:p-6 md:p-8 w-full bg-darkBase flex flex-col min-h-[calc(100vh-4rem)] md:ml-64 ${!sidebarOpen ? 'md:ml-0' : ''}`}>
                    <div className="flex-1">
                        {children}
                    </div>
                    <footer className="mt-12 pt-8 border-t border-gray-800 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="text-gray-400 text-sm">
                            Made by <span className="text-white font-bold ml-1">Amey Patel</span>
                        </div>
                        <div className="flex space-x-6">
                            <a href="https://github.com/amey-op" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                                <Icons.Github />
                            </a>
                            <a href="https://www.linkedin.com/in/amey-patel-22b991374" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-neonBlue transition-colors">
                                <Icons.Linkedin />
                            </a>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

const Home = () => {
    const { semesters } = useContext(DataContext);
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

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(semesters, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "gradevault_export.json");
        dlAnchorElem.click();
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
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <button onClick={handleDownload} className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                    <Icons.Download /> <span>Export JSON</span>
                </button>
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
        </div>
    );
};

const SemesterView = () => {
    const { id } = useParams();
    const { semesters, loadData } = useContext(DataContext);
    const navigate = useNavigate();
    
    const sem = semesters.find(s => s.id == id);
    
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ course_name: '', course_code: '', credits: 3, grade: '' });
    const [semNameForm, setSemNameForm] = useState('');
    
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
        await api.createCourse(sem.id, newCourse);
        setShowAddCourse(false);
        setNewCourse({ course_name: '', course_code: '', credits: 3, grade: '' });
        loadData();
    };

    const handleDeleteSem = async () => {
        if (confirm("Delete this semester and all its courses?")) {
            await api.deleteSemester(sem.id);
            loadData();
            navigate('/');
        }
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
                            <input required type="number" min="1" max="6" className="w-full bg-darkBase border border-gray-700 rounded p-2 focus:border-neonBlue outline-none" value={newCourse.credits} onChange={e => setNewCourse({...newCourse, credits: parseInt(e.target.value)})} />
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
        </div>
    );
};

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
    const [formData, setFormData] = useState({ category: 'Quiz', name: '', weightage: 10, marks_obtained: 0, max_marks: 100, average_marks: '' });

    const [showGradeDropdown, setShowGradeDropdown] = useState(false);
    const GRADES = ["N/A", "A", "A-", "B", "B-", "C", "C-", "D", "F"];

    const [courseFormData, setCourseFormData] = useState({ course_name: '', course_code: '', credits: 3 });

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
            alert(`Total weightage cannot exceed 100%. Current: ${currentWeightage}%, Adding: ${formData.weightage}%`);
            return;
        }

        const payload = { ...formData, average_marks: formData.average_marks === "" ? null : formData.average_marks };

        if (editingId) {
            await api.updateAssessment(editingId, payload);
        } else {
            await api.createAssessment(course.id, payload);
        }
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ category: 'Quiz', name: '', weightage: 10, marks_obtained: 0, max_marks: 100, average_marks: '' });
        loadData();
    };

    const handleDeleteCourse = async () => {
        if(confirm("Delete this course and all assessments?")) {
            await api.deleteCourse(course.id);
            loadData();
            navigate(`/semester/${parentSem.id}`);
        }
    };

    const handleDeleteAssessment = async (assId) => {
        if(confirm("Delete this assessment?")) {
            await api.deleteAssessment(assId);
            loadData();
        }
    };

    const editAssessment = (ass) => {
        setFormData({ ...ass });
        setEditingId(ass.id);
        setShowAddModal(true);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-gray-800 gap-6">
                <div className="flex-1 w-full md:w-auto mr-0 md:mr-8">
                    <div className="flex items-center space-x-3 mb-2">
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
                                onChange={e => handleCourseChange('credits', parseInt(e.target.value))} 
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
                                <div className="absolute top-full mt-2 right-0 md:left-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-2 z-50 w-64 animate-fade-in">
                                    {GRADES.map(g => (
                                        <button
                                            key={g}
                                            onClick={async () => {
                                                await api.updateCourse(course.id, { ...course, grade: g === "N/A" ? null : g });
                                                setShowGradeDropdown(false);
                                                loadData();
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
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
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
                                <input required type="number" step="0.1" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.weightage} onChange={e => setFormData({...formData, weightage: parseFloat(e.target.value)})} />
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Max Marks</label>
                                    <input required type="number" step="0.5" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={formData.max_marks} onChange={e => setFormData({...formData, max_marks: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Marks Obtained</label>
                                    <input required type="number" step="0.5" max={formData.max_marks} className="w-full bg-darkBase border border-gray-700 rounded p-2 text-neonEmerald font-bold focus:border-neonEmerald outline-none" value={formData.marks_obtained} onChange={e => setFormData({...formData, marks_obtained: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Class Avg (Opt.)</label>
                                    <input type="number" step="0.5" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-gray-400 focus:border-neonEmerald outline-none" value={formData.average_marks} onChange={e => setFormData({...formData, average_marks: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-800">
                                <button type="button" onClick={() => {setShowAddModal(false); setEditingId(null);}} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="bg-neonEmerald hover:bg-emerald-500 text-black font-bold px-6 py-2 rounded transition-colors">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const fakeEmail = `${username.toLowerCase().trim()}@gradevault.internal`;
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signUp({ email: fakeEmail, password });
                if (error) {
                    if (error.message.includes('User already registered')) {
                        throw new Error('Username already taken, please choose another.');
                    }
                    throw error;
                }
                if (data?.user) {
                    await supabase.from('profiles').insert({ id: data.user.id, username });
                    alert('Signup successful! You can now log in.');
                    setIsLogin(true);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-xl w-full max-w-md border border-gray-800">
                <div className="text-center mb-8">
                    <div className="text-3xl font-black tracking-wider text-white mb-2">GradeVault</div>
                    <div className="text-gray-400 text-sm">Welcome back to your academic hub.</div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error}</div>}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Username</label>
                        <input required type="text" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Password</label>
                        <input required type="password" minLength="6" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-neonEmerald hover:bg-emerald-500 text-black font-bold py-2 rounded transition-colors disabled:opacity-50">
                        {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button type="button" onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-neonBlue hover:text-blue-400 transition-colors font-medium">
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadData = async () => {
        if (!session) return;
        setLoading(true);
        try {
            const res = await api.getSemesters();
            setSemesters(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            supabase.from('profiles').select('username').eq('id', session.user.id).single().then(({data}) => {
                if (data) setProfile(data);
            });
            loadData();
        } else {
            setProfile(null);
            setLoading(false);
        }
    }, [session]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-neonEmerald animate-pulse font-bold text-xl">Loading System...</div>;

    if (!session) return <Auth />;

    return (
        <DataContext.Provider value={{ semesters, loadData, profile }}>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/semester/:id" element={<SemesterView />} />
                        <Route path="/course/:id" element={<CourseView />} />
                        <Route path="*" element={<div className="p-8 text-center text-gray-500">404 - Not Found</div>} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </DataContext.Provider>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
