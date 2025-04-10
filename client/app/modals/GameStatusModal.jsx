const GameStatusModal = ({ status, roomId }) => {
  if (status === "connecting") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-white text-2xl font-bold mb-4">
            Connecting to server...
          </h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-white text-2xl font-bold mb-4">
            Waiting for opponent
          </h2>
          <p className="text-white mb-6">
            Share this room ID with your friend:
          </p>
          <div className="bg-gray-700 p-4 rounded-lg text-center mb-6">
            <span className="text-white text-xl font-mono select-all">
              {roomId}
            </span>
          </div>
          <p className="text-white text-sm opacity-70">
            Your game will start automatically when they join
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default GameStatusModal;
