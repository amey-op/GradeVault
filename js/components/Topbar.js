const TopbarProfile = () => {
    const { profile, session } = useContext(DataContext);
    const [showMenu, setShowMenu] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [usernameForm, setUsernameForm] = useState(profile?.username || '');
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', onConfirm: null, isAlert: false });

    useEffect(() => {
        if (profile) setUsernameForm(profile.username);
    }, [profile]);

    const handleChangeUsername = async (e) => {
        e.preventDefault();
        await supabase.from('profiles').update({ username: usernameForm }).eq('id', session.user.id);
        setShowUsernameModal(false);
        window.location.reload();
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setModalConfig({
                open: true,
                title: 'Password Mismatch',
                message: 'Passwords do not match.',
                isAlert: true,
                confirmText: 'OK',
                onConfirm: () => setModalConfig(prev => ({ ...prev, open: false }))
            });
            return;
        }
        await supabase.auth.updateUser({ password: passwordForm.newPassword });
        setShowPasswordModal(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        setModalConfig({
            open: true,
            title: 'Password Updated',
            message: 'Your password has been successfully updated.',
            isAlert: true,
            confirmText: 'OK',
            onConfirm: () => setModalConfig(prev => ({ ...prev, open: false }))
        });
    };

    const handleDeleteAccount = () => {
        setModalConfig({
            open: true,
            title: 'Delete Account',
            message: 'Are you absolutely sure you want to delete your account? This action cannot be undone and will delete all your data.',
            confirmText: 'Delete Everything',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, open: false }));
                await supabase.from('semesters').delete().eq('user_id', session.user.id);
                await supabase.auth.signOut();
            }
        });
    };

    if (!profile) return null;

    return (
        <div className="relative">
            <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="flex items-center space-x-1 text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors border border-gray-700 font-medium text-sm"
            >
                <span>MyProfile</span>
                <Icons.ChevronDown />
            </button>
            
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 py-2 animate-fade-in flex flex-col">
                        <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-400 mb-1">
                            Signed in as <span className="text-white font-bold block truncate">{profile.username}</span>
                        </div>
                        <button onClick={() => { setShowMenu(false); setShowUsernameModal(true); }} className="text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">Change Username</button>
                        <button onClick={() => { setShowMenu(false); setShowPasswordModal(true); }} className="text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">Change Password</button>
                        <button onClick={() => { setShowMenu(false); handleDeleteAccount(); }} className="text-left px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-gray-800 transition-colors">Delete Account</button>
                        <div className="border-t border-gray-800 mt-1 pt-1">
                            <button onClick={async () => await supabase.auth.signOut()} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors flex items-center space-x-2">
                                <Icons.Logout /> <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showUsernameModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="glass-panel w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-white">Change Username</h2>
                        <form onSubmit={handleChangeUsername} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">New Username</label>
                                <input required type="text" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={usernameForm} onChange={e => setUsernameForm(e.target.value)} />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                                <button type="button" onClick={() => setShowUsernameModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="bg-neonEmerald hover:bg-emerald-500 text-black font-bold px-4 py-2 rounded transition-colors">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="glass-panel w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-white">Change Password</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">New Password</label>
                                <input required type="password" minLength="6" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
                                <input required type="password" minLength="6" className="w-full bg-darkBase border border-gray-700 rounded p-2 text-white focus:border-neonEmerald outline-none" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="bg-neonEmerald hover:bg-emerald-500 text-black font-bold px-4 py-2 rounded transition-colors">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="z-[70] relative"><ConfirmModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, open: false }))} /></div>
        </div>
    );
};

const Topbar = ({ sidebarOpen, setSidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <div className="h-16 border-b border-gray-800 glass-panel fixed top-0 w-full z-50 flex items-center px-4 md:px-6 justify-between">
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
            <div className="flex items-center space-x-3 md:space-x-4">
                <div className="text-lg md:text-xl font-black tracking-wider text-white truncate">GradeVault</div>
                <TopbarProfile />
            </div>
        </div>
    );
};
