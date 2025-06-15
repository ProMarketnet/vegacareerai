import React, { useState } from 'react';

const LLMTester = () => {
  const [query, setQuery] = useState('');
  const [model, setModel] = useState('claude-3-haiku-20240307');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('claude');

  // Fetch available providers on component mount
  React.useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      // Use the production server endpoint
      const response = await fetch('http://localhost:3001/api/llm/providers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch providers');
      }
      
      setProviders(data.data || []);
      
      // Set default model from first available provider
      if (data.data && data.data.length > 0) {
        const firstProvider = data.data[0];
        if (firstProvider.models && firstProvider.models.length > 0) {
          setModel(firstProvider.models[0]);
          setSelectedProvider(firstProvider.name);
        }
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Failed to fetch providers: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      // Generate a demo user ID (in production, this would come from authentication)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch('http://localhost:3001/api/llm/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          messages: [
            {
              role: 'user',
              content: query.trim()
            }
          ],
          model: model,
          max_tokens: 1000,
          temperature: 0.7
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResponse(data.data);
      } else {
        setError(data.message || 'Failed to get response');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (e) => {
    const selectedModel = e.target.value;
    setModel(selectedModel);
    
    // Find the provider for this model
    const provider = providers.find(p => p.models.includes(selectedModel));
    if (provider) {
      setSelectedProvider(provider.name);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">LLM Credit System Tester</h2>
        <p className="text-sm text-gray-600">
          🔗 Connected to production server at localhost:3001
        </p>
      </div>
      
      {/* Provider Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Available Providers</h3>
        {providers.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Loading providers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <div key={provider.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{provider.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    provider.status === 'available' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {provider.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {provider.models.length} models • ${provider.pricing.per_1k_tokens}/1K tokens
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {provider.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            Select Model
          </label>
          <select
            id="model"
            value={model}
            onChange={handleModelChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {providers.flatMap(provider => 
              provider.models.map(modelName => (
                <option key={modelName} value={modelName}>
                  {provider.name.toUpperCase()} - {modelName}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Your Question
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything to test the LLM credit system..."
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim() || providers.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Send Query (Uses Credits)'}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Response</h3>
            <p className="text-green-700 whitespace-pre-wrap">{response.response}</p>
            {response.is_mock && (
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                ⚠️ This is a mock response. Real API call failed: {response.mock_reason}
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Usage Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Provider:</span>
                <div className="text-gray-600 capitalize">{response.provider}</div>
              </div>
              <div>
                <span className="font-medium">Model:</span>
                <div className="text-gray-600">{response.model}</div>
              </div>
              <div>
                <span className="font-medium">Total Tokens:</span>
                <div className="text-gray-600">{response.usage?.total_tokens || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Credits Consumed:</span>
                <div className="text-blue-600 font-semibold">{response.credits_consumed}</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Response Time: {Math.round(response.response_time_ms)}ms | 
              Request ID: {response.request_id}
            </div>
            {response.usage && (
              <div className="mt-2 text-xs text-gray-500">
                Prompt: {response.usage.prompt_tokens} tokens • 
                Completion: {response.usage.completion_tokens} tokens
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demo Notice */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Demo Mode</p>
            <p className="text-sm text-blue-800 mt-1">
              This connects to real LLM APIs when available, otherwise shows mock responses. 
              Credits are calculated based on actual usage patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMTester; 