import React from 'react';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-800 to-gray-900 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl max-w-xl w-full text-center border border-white/20">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 animate-pulse drop-shadow-lg">
          Welcome to Learning Assistant
        </h1>
        <a href="/query">
          <button className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:from-purple-500 hover:to-pink-500">
            🚀 Start Learning
          </button>
        </a>
      </div>
    </div>
  );
};

export default Home;
