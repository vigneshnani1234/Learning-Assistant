import React from 'react';
import { SignInButton } from '@clerk/clerk-react';

const Login = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-950 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl p-10 rounded-3xl text-center w-full max-w-md">
        <h2 className="text-3xl font-bold text-white mb-6">
          Ready to Explore?
        </h2>
        <SignInButton mode="modal">
          <button className="w-full px-6 py-3 text-white font-semibold rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-pink-500 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 animate-glow">
            Sign In to Get Started
          </button>
        </SignInButton>
      </div>
    </div>
  );
};

export default Login;
