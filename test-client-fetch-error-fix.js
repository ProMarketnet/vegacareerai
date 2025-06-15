#!/usr/bin/env node

/**
 * Test Script: CLIENT_FETCH_ERROR Fix Verification
 * 
 * This script verifies that the NextAuth CLIENT_FETCH_ERROR has been resolved
 * by testing the Vite React application without NextAuth dependencies.
 */

import chalk from 'chalk';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

console.log(chalk.blue.bold('🔍 CLIENT_FETCH_ERROR Fix Verification'));
console.log(chalk.blue('=====================================\n'));

const tests = [
  {
    name: 'Environment Configuration',
    description: 'Verify Vite-specific environment variables',
    test: async () => {
      const fs = await import('fs');
      
      // Check if .env.local exists and has correct format
      if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const hasViteVars = envContent.includes('VITE_');
        const hasNextAuthVars = envContent.includes('NEXTAUTH_');
        
        if (hasViteVars && !hasNextAuthVars) {
          return { success: true, message: 'Environment variables correctly configured for Vite' };
        } else if (hasNextAuthVars) {
          return { success: false, message: 'Still contains NextAuth variables (should be removed)' };
        } else {
          return { success: false, message: 'Missing Vite environment variables' };
        }
      } else {
        return { success: false, message: '.env.local file not found' };
      }
    }
  },
  
  {
    name: 'Authentication Context',
    description: 'Verify React authentication context exists',
    test: async () => {
      const fs = await import('fs');
      
      if (fs.existsSync('src/contexts/AuthContext.tsx')) {
        const authContent = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
        const hasAuthProvider = authContent.includes('AuthProvider');
        const hasUseAuth = authContent.includes('useAuth');
        
        if (hasAuthProvider && hasUseAuth) {
          return { success: true, message: 'Authentication context properly implemented' };
        } else {
          return { success: false, message: 'Authentication context incomplete' };
        }
      } else {
        return { success: false, message: 'Authentication context file not found' };
      }
    }
  },
  
  {
    name: 'NextAuth Dependencies Removed',
    description: 'Verify NextAuth is not in package.json',
    test: async () => {
      const fs = await import('fs');
      
      if (fs.existsSync('package.json')) {
        const packageContent = fs.readFileSync('package.json', 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        const hasNextAuth = packageJson.dependencies?.['next-auth'] || 
                           packageJson.devDependencies?.['next-auth'];
        
        if (!hasNextAuth) {
          return { success: true, message: 'NextAuth dependency correctly removed' };
        } else {
          return { success: false, message: 'NextAuth still in package.json (should be removed)' };
        }
      } else {
        return { success: false, message: 'package.json not found' };
      }
    }
  },
  
  {
    name: 'Backend Server Health',
    description: 'Verify backend server is accessible',
    test: async () => {
      try {
        const response = await fetch('http://localhost:3001/health', {
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `Backend server healthy: ${data.status}` };
        } else {
          return { success: false, message: `Backend server returned ${response.status}` };
        }
      } catch (error) {
        return { success: false, message: `Backend server not accessible: ${error.message}` };
      }
    }
  },
  
  {
    name: 'Startup Script Configuration',
    description: 'Verify startup script has correct configuration',
    test: async () => {
      const fs = await import('fs');
      
      if (fs.existsSync('start-complete-system.sh')) {
        const scriptContent = fs.readFileSync('start-complete-system.sh', 'utf8');
        const hasNextAuthConfig = scriptContent.includes('NEXTAUTH_URL') || 
                                 scriptContent.includes('NEXTAUTH_SECRET');
        const hasCorrectComment = scriptContent.includes('Vite React app, not Next.js');
        
        if (!hasNextAuthConfig && hasCorrectComment) {
          return { success: true, message: 'Startup script correctly configured' };
        } else if (hasNextAuthConfig) {
          return { success: false, message: 'Startup script still has NextAuth configuration' };
        } else {
          return { success: false, message: 'Startup script needs updating' };
        }
      } else {
        return { success: false, message: 'Startup script not found' };
      }
    }
  }
];

// Run all tests
async function runTests() {
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(chalk.yellow(`🧪 Testing: ${test.name}`));
    console.log(chalk.gray(`   ${test.description}`));
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(chalk.green(`   ✅ PASS: ${result.message}`));
        passedTests++;
      } else {
        console.log(chalk.red(`   ❌ FAIL: ${result.message}`));
      }
    } catch (error) {
      console.log(chalk.red(`   ❌ ERROR: ${error.message}`));
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log(chalk.blue.bold('📊 Test Summary'));
  console.log(chalk.blue('==============='));
  console.log(`Tests passed: ${chalk.green(passedTests)}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log(chalk.green.bold('\n🎉 All tests passed! CLIENT_FETCH_ERROR should be resolved.'));
    console.log(chalk.green('\nNext steps:'));
    console.log(chalk.white('1. Run: ./start-complete-system.sh'));
    console.log(chalk.white('2. Open: http://localhost:5173'));
    console.log(chalk.white('3. Check browser console for any remaining errors'));
  } else {
    console.log(chalk.red.bold('\n⚠️  Some tests failed. Please review the issues above.'));
  }
  
  console.log(chalk.blue('\n📖 For detailed explanation, see: NEXTAUTH_CLIENT_FETCH_ERROR_RESOLUTION.md'));
}

// Additional helper function to check if frontend is running
async function checkFrontendStatus() {
  console.log(chalk.blue.bold('\n🌐 Frontend Status Check'));
  console.log(chalk.blue('========================'));
  
  const ports = [5173, 5174, 5175, 5176, 5177];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        timeout: 2000
      });
      
      if (response.ok) {
        console.log(chalk.green(`✅ Frontend running on port ${port}`));
        console.log(chalk.white(`   URL: http://localhost:${port}`));
        return;
      }
    } catch (error) {
      // Port not accessible, continue checking
    }
  }
  
  console.log(chalk.yellow('⚠️  Frontend not currently running'));
  console.log(chalk.white('   Start with: npm run dev or ./start-complete-system.sh'));
}

// Run the tests
runTests().then(() => {
  return checkFrontendStatus();
}).catch(error => {
  console.error(chalk.red('Test execution failed:'), error);
  process.exit(1);
}); 