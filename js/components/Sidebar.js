const Sidebar = ({ isOpen }) => {
    const { semesters, loadData } = useContext(DataContext);
    const [newSemName, setNewSemName] = useState("");
    const [showAddSem, setShowAddSem] = useState(false);

    const handleAddSem = async (e) => {
        e.preventDefault();
        if (!newSemName) return;
        await api.createSemester({ name: newSemName });
        setNewSemName("");
        setShowAddSem(false);
        loadData();
    };

    return (
        <div className={`w-64 border-r border-gray-800 glass-panel fixed left-0 top-16 bottom-0 flex flex-col transition-transform duration-300 z-50 md:z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="pt-6 px-6 mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Semesters</div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
                {semesters.map(s => (
                    <Link key={s.id} to={`/semester/${s.id}`} className="block px-6 py-3 hover:bg-gray-800 hover:text-neonEmerald transition-colors border-l-2 border-transparent hover:border-neonEmerald text-gray-300">
                        {s.name}
                    </Link>
                ))}
                <div className="px-6 py-2">
                    {showAddSem ? (
                        <form onSubmit={handleAddSem} className="flex space-x-2 animate-fade-in mt-1">
                            <input 
                                type="text" 
                                value={newSemName}
                                onChange={e => setNewSemName(e.target.value)}
                                placeholder="New Semester..."
                                autoFocus
                                className="bg-darkSurface border border-gray-700 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-neonEmerald text-white"
                            />
                            <button type="submit" className="bg-neonEmerald text-black rounded p-1 hover:bg-emerald-400 transition-colors">
                                <Icons.Plus />
                            </button>
                        </form>
                    ) : (
                        <button onClick={() => setShowAddSem(true)} className="text-gray-400 hover:text-white text-sm flex items-center transition-colors group mt-1">
                            <span className="opacity-50 group-hover:opacity-100 mr-1">+</span> Add Semester
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
