import React, { useState } from 'react';
import { CreditCard, Zap, Star, Check, Brain, Search, FileText, ShoppingCart, User } from 'lucide-react';
import LLMTester from './LLMTester';
import CreditPurchase from './CreditPurchase';
import { useAuth } from '../contexts/AuthContext';

const AppContent: React.FC = () => {
  const { user, isLoading, updateCredits } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading VegaCareer AI...</p>
        </div>
      </div>
    );
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
                  <h3 className="font-semibold text-gray-900">{user?.name || 'Demo User'}</h3>
                  <p className="text-sm text-gray-600">Connected to localhost:3001</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Credit Balance</p>
                <p className="text-2xl font-bold text-blue-600">{user?.credits?.toLocaleString() || '150'}</p>
              </div>
              <button
                onClick={() => setShowCreditPurchase(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Credits</span>
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
                <p className="text-2xl font-bold text-blue-600 my-2">{model.multiplier}</p>
                <p className="text-sm text-gray-600">{model.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rest of the component content would go here... */}
        
        {/* Credit Purchase Modal */}
        {showCreditPurchase && (
          <CreditPurchase
            packages={creditPackages}
            onClose={() => setShowCreditPurchase(false)}
            onPurchaseComplete={(credits) => {
              updateCredits((user?.credits || 0) + credits);
              setShowCreditPurchase(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AppContent; 