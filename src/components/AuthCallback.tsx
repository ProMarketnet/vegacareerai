import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('Authentication failed. Please try again.')
          return
        }

        if (data.session) {
          // Successfully authenticated, redirect to main app
          navigate('/', { replace: true })
        } else {
          // No session found, redirect to login
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Completing sign-in...</h2>
          <p className="text-gray-500">Please wait while we authenticate you.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Authentication Error</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallback 