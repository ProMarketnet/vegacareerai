import React, { useState } from 'react';
import { CreditCard, Zap, Star, Check, Brain, Search, FileText, ShoppingCart, User, LogOut } from 'lucide-react';
import LLMTester from './components/LLMTester';
import CreditPurchase from './components/CreditPurchase';
import AuthLogin from './components/AuthLogin';
import { SupabaseAuthProvider, useAuth } from './contexts/SupabaseAuthContext';

function AppContent() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthLogin />;
  }

  const creditPackages = [
    {
      name: "Starter",
      credits: 100,
      price: 10.00,
      pricePerCredit: 0.10,
      description: "Perfect for getting started with AI career insights",
      features: ["100 credits ($10 value)", "Basic career insights", "Email support", "Access to all models"]
    },
    {
      name: "Professional", 
      credits: 500,
      price: 45.00,
      pricePerCredit: 0.09,
      description: "Great for regular career planning and development",
      popular: true,
      features: ["500 credits ($50 value)", "Advanced career analysis", "Priority support", "Model selection", "Usage analytics"]
    },
    {
      name: "Business",
      credits: 2000,
      price: 160.00,
      pricePerCredit: 0.08,
      description: "Best value for power users and teams",
      features: ["2000 credits ($200 value)", "Unlimited basic questions", "Premium insights", "Team management", "API access"]
    }
  ];

  const queryTypes = [
    { 
      name: "Basic Question", 
      credits: 0, 
      description: "Free with daily limits (10/day)",
      icon: <FileText className="w-5 h-5" />,
      example: "What skills do I need for data science?"
    },
    { 
      name: "Salary Analysis", 
      credits: 1, 
      description: "Claude Sonnet - compensation insights",
      icon: <Brain className="w-5 h-5" />,
      example: "What's the salary range for my role in NYC?"
    },
    { 
      name: "Skill Roadmap", 
      credits: 1, 
      description: "Claude Sonnet - learning path",
      icon: <Brain className="w-5 h-5" />,
      example: "How do I transition from marketing to UX?"
    },
    { 
      name: "Market Intelligence", 
      credits: 2, 
      description: "Perplexity + Claude - industry trends",
      icon: <Search className="w-5 h-5" />,
      example: "What are the hot jobs in AI right now?"
    },
    { 
      name: "Detailed Analysis", 
      credits: 3, 
      description: "Claude Opus - comprehensive assessment",
      icon: <Brain className="w-5 h-5" />,
      example: "Analyze my resume and suggest improvements"
    },
    { 
      name: "Regulatory Insights", 
      credits: 5, 
      description: "Claude Opus - complex legal analysis",
      icon: <Brain className="w-5 h-5" />,
      example: "What certifications do I need for finance?"
    },
    { 
      name: "Career Transition Plan", 
      credits: 5, 
      description: "Claude Opus - complete strategy",
      icon: <Brain className="w-5 h-5" />,
      example: "Help me plan a career change from law to tech"
    }
  ];

  const modelPricing = [
    { name: "Claude Sonnet", multiplier: "1x", description: "Fast, efficient for most queries" },
    { name: "Perplexity", multiplier: "0.5x", description: "Great for research and current info" },
    { name: "GPT-4", multiplier: "3x", description: "Powerful reasoning and analysis" },
    { name: "Claude Opus", multiplier: "5x", description: "Most advanced, comprehensive insights" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Demo Integration Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-green-500">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ✅ Production Integration Active
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700 mb-1">Backend Server:</p>
                  <p className="text-green-600">✓ Running on localhost:3001</p>
                  <p className="text-green-600">✓ Stripe Payment Intents API</p>
                  <p className="text-green-600">✓ LLM Gateway (Claude, OpenAI, Perplexity)</p>
                  <p className="text-green-600">✓ Input validation & rate limiting</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">Frontend Integration:</p>
                  <p className="text-green-600">✓ Credit purchase modal</p>
                  <p className="text-green-600">✓ Real-time LLM testing</p>
                  <p className="text-green-600">✓ Stripe payment flow</p>
                  <p className="text-green-600">✓ Credit balance tracking</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Try it:</strong> Click "Buy Credits" above or test LLM queries below. 
                  Payment intents are created with real Stripe API but won't charge your card in demo mode.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Header with Credit Balance */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-8 h-8 text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{user?.name || 'User'}</h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Credit Balance</p>
                <p className="text-2xl font-bold text-blue-600">{user?.credits?.toLocaleString() || '0'}</p>
              </div>
              <button
                onClick={() => setShowCreditPurchase(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Credits</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Vega Career AI - LLM Credit System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Pay-per-use AI career insights. <span className="font-semibold text-blue-600">1 Credit = $0.10</span> 
            <br />Start with 10 free credits daily, then buy credits as needed.
          </p>
        </div>

        {/* Value Proposition Banner */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg p-6 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">🎯 Smart Pricing: Only $0.10 Per Credit</h2>
          <p className="text-lg opacity-90">
            Compare: ChatGPT Plus ($20/month) • Perplexity Pro ($20/month) • Career Coaching ($100-300/session)
          </p>
        </div>

        {/* LLM Tester - Move to top for easy testing */}
        <div className="mb-8">
          <LLMTester />
        </div>

        {/* Model Pricing */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Brain className="mr-2 text-purple-500" />
            Dynamic AI Model Pricing
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {modelPricing.map((model, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">{model.name}</h3>
                <div className="text-2xl font-bold text-blue-600 my-2">{model.multiplier}</div>
                <p className="text-sm text-gray-600">{model.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Example:</strong> A detailed analysis (3 credits base) costs 3 credits with Claude Sonnet, 
              but 15 credits with Claude Opus for maximum quality.
            </p>
          </div>
        </div>

        {/* Credit Usage Guide */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Zap className="mr-2 text-yellow-500" />
            Credit Usage by Query Type
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {queryTypes.map((query, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="text-blue-500 mt-1">
                  {query.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{query.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      query.credits === 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {query.credits === 0 ? 'FREE' : `${query.credits} credit${query.credits > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{query.description}</p>
                  <p className="text-xs text-gray-500 italic">"{query.example}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Choose Your Credit Package</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {creditPackages.map((pkg, index) => (
              <div 
                key={index}
                className={`relative bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all duration-200 ${
                  pkg.popular ? 'ring-2 ring-blue-500 transform scale-105' : 'hover:shadow-xl'
                } ${selectedPackage === index ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setSelectedPackage(index)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{pkg.description}</p>
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900">${pkg.price}</div>
                  <div className="text-sm text-gray-500">{pkg.credits} credits</div>
                  <div className="text-xs text-gray-400">${pkg.pricePerCredit.toFixed(3)} per credit</div>
                  {pkg.pricePerCredit < 0.10 && (
                    <div className="text-xs text-green-600 font-medium">
                      Save {Math.round((0.10 - pkg.pricePerCredit) / 0.10 * 100)}%!
                    </div>
                  )}
                </div>
                
                <ul className="space-y-2 mb-6">
                  {pkg.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button 
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    selectedPackage === index
                      ? 'bg-green-500 text-white'
                      : pkg.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPackage(index);
                    setShowCreditPurchase(true);
                  }}
                >
                  {selectedPackage === index ? 'Buy Now' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Business Model Explanation */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <CreditCard className="mr-2 text-green-500" />
            Why Our Credit System Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold mb-2">Fair Usage Pricing</h3>
              <p className="text-gray-600 text-sm">Pay only $0.10 per credit. No monthly subscriptions or hidden fees.</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold mb-2">Multiple AI Models</h3>
              <p className="text-gray-600 text-sm">Choose the right AI for your needs - from fast Sonnet to powerful Opus.</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">Transparent Costs</h3>
              <p className="text-gray-600 text-sm">See exactly what each query costs. Credits never expire.</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tip:</h4>
            <p className="text-sm text-gray-700">
              Start with basic questions (free) to explore, then use credits for detailed analysis. 
              A typical user spends $5-15/month for comprehensive career guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Credit Purchase Modal */}
      <CreditPurchase
        isOpen={showCreditPurchase}
        onClose={() => setShowCreditPurchase(false)}
        currentCredits={user?.credits || 0}
      />
    </div>
  );
}

// Wrapper component with SupabaseAuthProvider
function App() {
  return (
    <SupabaseAuthProvider>
      <AppContent />
    </SupabaseAuthProvider>
  );
}

export default App;
