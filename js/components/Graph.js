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
