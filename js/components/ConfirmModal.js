const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isAlert = false }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-sm rounded-xl p-6 border border-gray-700 shadow-2xl animate-fade-in">
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-gray-400 text-sm mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex justify-end space-x-3">
                    {!isAlert && (
                        <button onClick={onCancel} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium">
                            {cancelText}
                        </button>
                    )}
                    <button onClick={onConfirm} className={`px-4 py-2 text-white rounded transition-colors text-sm font-medium ${isAlert ? 'bg-neonBlue hover:bg-blue-600' : 'bg-neonRed hover:bg-red-600'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
