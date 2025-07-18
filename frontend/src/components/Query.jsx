import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Query = ({ setResearchResult, setIsLoading, isLoading, setError, error }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    prompt: '',
    fromYouTube: false,
    fromPDF: false,
    fromWeb: false,
    fromResearchPapers: false,
  });

  const [youtubeLink, setYoutubeLink] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!(form.fromYouTube || form.fromPDF || form.fromWeb || form.fromResearchPapers)) {
      setError('Please select at least one source.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('prompt', form.prompt);

    if (form.fromWeb) formData.append('sources', 'fromWeb');
    if (form.fromYouTube) {
      formData.append('sources', 'fromYouTube');
      formData.append('youtube_link', youtubeLink);
    }
    if (form.fromPDF && pdfFile) {
      formData.append('sources', 'fromPDF');
      formData.append('pdf_document', pdfFile);
    }
    if (form.fromResearchPapers) formData.append('sources', 'fromResearchPapers');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/research', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setResearchResult(data);
      navigate('/answer');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-8 w-full max-w-3xl">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Unified Multi-Source Research Assistant</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-semibold mb-1">
              Enter your Research Topic or Question
            </label>
            <textarea
              id="prompt"
              name="prompt"
              value={form.prompt}
              onChange={handleChange}
              rows={4}
              placeholder="e.g. What are the latest breakthroughs in quantum computing?"
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Select Sources</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="fromWeb"
                  checked={form.fromWeb}
                  onChange={handleChange}
                  className="accent-indigo-500 w-4 h-4"
                />
                <span>Web Search</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="fromResearchPapers"
                  checked={form.fromResearchPapers}
                  onChange={handleChange}
                  className="accent-indigo-500 w-4 h-4"
                />
                <span>Academic Papers (ArXiv)</span>
              </label>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="fromYouTube"
                  checked={form.fromYouTube}
                  onChange={handleChange}
                  className="accent-indigo-500 mt-1 w-4 h-4"
                />
                <div className="w-full">
                  <span>YouTube</span>
                  {form.fromYouTube && (
                    <input
                      type="text"
                      placeholder="Paste YouTube video URL"
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      className="mt-2 w-full p-2 bg-white/10 border border-white/20 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                </div>
              </label>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="fromPDF"
                  checked={form.fromPDF}
                  onChange={handleChange}
                  className="accent-indigo-500 mt-1 w-4 h-4"
                />
                <div className="w-full">
                  <span>PDF Document</span>
                  {form.fromPDF && (
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files[0])}
                      className="mt-2 w-full text-sm text-white file:bg-indigo-600 file:text-white file:px-4 file:py-2 file:rounded-lg file:border-none hover:file:bg-indigo-700 transition-all"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl disabled:opacity-50"
          >
            {isLoading ? 'Researching...' : 'Start Research'}
          </button>

          {error && (
            <div className="mt-4 text-red-400 bg-red-900/20 border border-red-500/20 p-3 rounded-md text-sm animate-pulse">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Query;
