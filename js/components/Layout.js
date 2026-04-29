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
                    <div className="fixed inset-0 bg-black/80 z-40 md:hidden mt-16" onClick={() => setSidebarOpen(false)}></div>
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
