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
        try {
            const res = await api.getSemesters();
            setSemesters(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const userId = session?.user?.id;
    useEffect(() => {
        if (userId) {
            supabase.from('profiles').select('username').eq('id', userId).single().then(({data}) => {
                if (data) setProfile(data);
            });
            loadData();
        } else {
            setProfile(null);
            if (!session) setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession().then(({ data: { session: newSession } }) => {
                    setSession(newSession);
                    if (newSession) {
                        loadData();
                    }
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [session]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-neonEmerald animate-pulse font-bold text-xl">Loading System...</div>;

    if (!session) return <Auth />;

    return (
        <DataContext.Provider value={{ semesters, loadData, profile, session }}>
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
