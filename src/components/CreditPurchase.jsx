import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe('pk_live_51RYsvrJ1V7TuZJ0z4tL4lVz0zVrZPnTi3OFEF0aYWxjtUPKiKoYWt8sP02qzZFVAzt1XrBjNj2i6V9xuCtynpg86005tXMh1zV');

const CreditPurchase = ({ isOpen, onClose, currentCredits = 0 }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingPackageId, setProcessingPackageId] = useState(null);
  const [usePricingTable, setUsePricingTable] = useState(false);

  // Stripe Pricing Table ID (you'll get this from Stripe Dashboard)
  const PRICING_TABLE_ID = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || 'prctbl_your_pricing_table_id_here';

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/stripe/packages');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setPackages(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch packages');
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to load credit packages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseWithPaymentIntent = async (packageData) => {
    setProcessing(true);
    setProcessingPackageId(packageData.id);
    setError('');

    try {
      // Generate a demo user ID (in production, this would come from authentication)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create payment intent
      const response = await fetch('http://localhost:3001/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageData.id,
          user_id: userId
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create payment intent');
      }

      // Get Stripe instance
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Confirm payment with Stripe
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret: result.data.payment_intent.client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Payment successful - this will redirect to return_url
      console.log('Payment initiated successfully');
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
      setProcessingPackageId(null);
    }
  };

  const handlePurchaseWithPricingTable = async () => {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Redirect to Stripe Pricing Table
      await stripe.redirectToPricingTable({
        pricingTableId: PRICING_TABLE_ID,
        clientReferenceId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      
    } catch (err) {
      console.error('Pricing table error:', err);
      setError(err.message || 'Failed to load pricing table. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Buy Credits</h2>
              <p className="text-gray-600 mt-1">
                Current Balance: <span className="font-semibold text-blue-600">{currentCredits.toLocaleString()} credits</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Toggle between Payment Methods */}
          <div className="mb-6 flex items-center justify-center space-x-4">
            <button
              onClick={() => setUsePricingTable(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !usePricingTable 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Checkout
            </button>
            <button
              onClick={() => setUsePricingTable(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                usePricingTable 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stripe Pricing Table
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {usePricingTable ? (
            /* Stripe Pricing Table Option */
            <div className="text-center py-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Stripe Hosted Pricing Table
                </h3>
                <p className="text-gray-600">
                  Beautiful, hosted checkout experience powered by Stripe
                </p>
              </div>
              
              <button
                onClick={handlePurchaseWithPricingTable}
                disabled={processing}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Loading...' : 'Open Stripe Pricing Table'}
              </button>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>✅ Secure payment processing by Stripe</p>
                <p>✅ Multiple payment methods supported</p>
                <p>✅ Instant credit delivery</p>
              </div>
            </div>
          ) : (
            /* Custom Package Selection */
            <>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading packages...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative border rounded-lg p-6 transition-all hover:shadow-lg ${
                        pkg.popular ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Most Popular
                          </span>
                        </div>
                      )}
                      
                      {pkg.bestValue && (
                        <div className="absolute -top-3 right-4">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Best Value
                          </span>
                        </div>
                      )}

                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {pkg.name}
                        </h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900">
                            ${pkg.price}
                          </span>
                        </div>
                        <div className="mb-4">
                          <span className="text-xl font-semibold text-blue-600">
                            {pkg.credits.toLocaleString()} Credits
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            ${(pkg.price / pkg.credits).toFixed(3)} per credit
                          </p>
                        </div>
                        <p className="text-gray-600 text-sm mb-6">
                          {pkg.description}
                        </p>
                        <button
                          onClick={() => handlePurchaseWithPaymentIntent(pkg)}
                          disabled={processing}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                            processing && processingPackageId === pkg.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : pkg.popular
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          {processing && processingPackageId === pkg.id
                            ? 'Processing...'
                            : 'Purchase Now'
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>🔒 Secure payment processing powered by Stripe</p>
            <p>💳 All major credit cards accepted</p>
            <p>⚡ Credits added instantly after payment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditPurchase; 