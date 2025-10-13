#!/usr/bin/env node

const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testBuild() {
  console.log('🔨 Building the application...');

  try {
    // Build the app with full make process (not just package)
    execSync('npm run make', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');

    // Test both packaged and installed versions
    const packagedAppPath = path.join(__dirname, 'out/Commonbase Desktop-darwin-arm64/Commonbase Desktop.app/Contents/MacOS/Commonbase Desktop');
    const installedAppPath = '/Applications/Commonbase Desktop.app/Contents/MacOS/Commonbase Desktop';

    if (!fs.existsSync(packagedAppPath)) {
      console.error('❌ Built app not found at:', packagedAppPath);
      process.exit(1);
    }

    console.log('🧪 Testing built application...');
    console.log('📍 Testing packaged app at:', packagedAppPath);

    // Kill any existing instances first
    try {
      execSync('pkill -f "Commonbase Desktop"', { stdio: 'ignore' });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      // Ignore - no processes to kill
    }

    let hasError = false;
    let errorOutput = '';

    // Method 1: Try to launch the GUI app using macOS 'open' command
    console.log('🔍 Method 1: GUI application launch test...');

    const testPromise = new Promise((resolve) => {
      const appBundlePath = packagedAppPath.replace('/Contents/MacOS/Commonbase Desktop', '');
      const child = spawn('open', [appBundlePath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('STDOUT:', output);

        if (output.includes('Uncaught Exception:') ||
            output.includes('TypeError') ||
            output.includes('Error:') ||
            output.includes('ERR_INVALID_ARG_TYPE')) {
          hasError = true;
          errorOutput += output;
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.log('STDERR:', output);

        if (output.includes('Uncaught Exception:') ||
            output.includes('TypeError') ||
            output.includes('Error:') ||
            output.includes('ERR_INVALID_ARG_TYPE') ||
            output.includes('Cannot find module')) {
          hasError = true;
          errorOutput += output;
        }
      });

      child.on('exit', (code, signal) => {
        console.log(`Open command exited with code ${code} and signal ${signal}`);
        // 'open' command exits with 0 if it successfully launches the app
        // We don't consider this an error for GUI apps
        resolve({ hasError, errorOutput, stdout, stderr });
      });

      child.on('error', (error) => {
        console.log('Process error:', error);
        hasError = true;
        errorOutput += error.toString();
        resolve({ hasError, errorOutput, stdout, stderr });
      });

      // Kill after 8 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 8000);
    });

    const result = await testPromise;

    // Method 2: Check macOS Console logs for crashes
    console.log('🔍 Method 2: Checking Console logs...');
    try {
      const consoleOutput = execSync(`log show --predicate 'process == "Commonbase Desktop"' --last 30s`, { encoding: 'utf8', timeout: 5000 });
      if (consoleOutput.includes('Uncaught Exception:') ||
          consoleOutput.includes('TypeError') ||
          consoleOutput.includes('ERR_INVALID_ARG_TYPE')) {
        hasError = true;
        errorOutput += '\nConsole logs:\n' + consoleOutput;
      }
    } catch (e) {
      console.log('Could not check console logs:', e.message);
    }

    // Method 3: Try to open the app and check if it immediately crashes
    console.log('🔍 Method 3: Testing app launch behavior...');
    try {
      exec(`open "${packagedAppPath.replace('/Contents/MacOS/Commonbase Desktop', '')}"`, (error, stdout, stderr) => {
        if (error) {
          hasError = true;
          errorOutput += 'Open command error: ' + error.toString();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const processes = execSync('ps aux | grep "Commonbase Desktop" | grep -v grep', { encoding: 'utf8', timeout: 2000 }).trim();
      if (!processes) {
        console.log('❌ App did not stay running - likely crashed immediately');
        hasError = true;
        errorOutput += 'App did not stay running after launch';
      } else {
        console.log('✅ App appears to be running');
      }

      // Clean up
      execSync('pkill -f "Commonbase Desktop"', { stdio: 'ignore' });
    } catch (e) {
      console.log('Error in launch test:', e.message);
    }

    // Final assessment
    if (hasError) {
      console.error('\n💥 BUILD TEST FAILED');
      console.error('❌ Runtime errors detected:');
      console.error(errorOutput);
      console.error('\nDebug info:');
      console.error('STDOUT:', result.stdout);
      console.error('STDERR:', result.stderr);
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! App builds and runs without errors');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted');
  process.exit(1);
});

testBuild().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});