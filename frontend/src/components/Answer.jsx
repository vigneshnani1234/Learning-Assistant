import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Answer = ({ result, isLoading }) => {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  useEffect(() => {
    if (result?.chat_history) {
      setChatHistory(result.chat_history.slice(1));
    }
  }, [result]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-lg font-semibold animate-pulse">
        Generating your unified summary... Please wait.
      </div>
    );
  }

  if (!result?.summary) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">No Result Found</h2>
        <p className="text-gray-600">We couldn't retrieve a result. Please try your query again.</p>
        <button
          onClick={() => navigate('/query')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
        >
          Start New Research
        </button>
      </div>
    );
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsChatLoading(true);
    setChatError(null);

    const newUserMessage = { type: 'human', content: userInput };
    setChatHistory((prev) => [...prev, newUserMessage]);
    setUserInput('');

    try {
      const fullHistoryForBackend = [...result.chat_history, newUserMessage];
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_history: fullHistoryForBackend }),
      });

      if (!response.ok) throw new Error('Failed to get a response from the assistant.');
      const data = await response.json();
      setChatHistory((prev) => [...prev, data.ai_message]);
    } catch (err) {
      setChatError(err.message);
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT: Summary */}
      <div className="w-2/3 p-8 border-r border-gray-300 overflow-y-auto">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Your Unified Summary</h2>
        <div className="prose prose-lg max-w-full text-gray-800">
          {chatHistory.length > 0 && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {chatHistory[0].content}
            </ReactMarkdown>
          )}
        </div>
        <button
          onClick={() => navigate('/query')}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow"
        >
          Start New Research
        </button>
      </div>

      {/* RIGHT: Chat */}
      <div className="w-1/3 p-6 flex flex-col bg-white shadow-inner">
        <h3 className="text-xl font-semibold mb-2">Chat with the Assistant</h3>
        <p className="text-gray-600 mb-4">Ask follow-up questions about the summary.</p>

        <div className="flex-grow border border-gray-200 rounded-lg p-4 overflow-y-auto space-y-3 bg-gray-50">
          {chatHistory.slice(1).map((msg, i) => (
            <div
              key={i}
              className={`max-w-[80%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap shadow-sm ${
                msg.type === 'ai'
                  ? 'bg-gray-200 self-start'
                  : 'bg-blue-100 self-end'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isChatLoading && (
            <p className="text-gray-400 italic animate-pulse">Assistant is typing...</p>
          )}
          {chatError && <p className="text-red-500 text-sm">Error: {chatError}</p>}
        </div>

        <form onSubmit={handleChatSubmit} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isChatLoading}
            placeholder="Ask something..."
            className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isChatLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Answer;
