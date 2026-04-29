const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState({ open: false, title: '', message: '', onConfirm: null, isAlert: false });

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
                    setModalConfig({
                        open: true,
                        title: 'Signup Successful',
                        message: 'Signup successful! You can now log in.',
                        isAlert: true,
                        confirmText: 'OK',
                        onConfirm: () => {
                            setModalConfig(prev => ({ ...prev, open: false }));
                            setIsLogin(true);
                        }
                    });
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
            <ConfirmModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, open: false }))} />
        </div>
    );
};
