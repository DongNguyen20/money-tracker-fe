/**
 * Money Tracker Test Agent - Test Runner
 * Core logic for running automated tests
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.isRunning = false;
        this.currentTestIndex = 0;
    }

    log(message, type = 'info') {
        const consoleOutput = document.getElementById('consoleOutput');
        if (!consoleOutput) return;
        
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = `[${time}] ${message}`;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Also log to browser console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    updateStats() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        document.getElementById('totalTests').textContent = totalTests;
        document.getElementById('passedTests').textContent = passedTests;
        document.getElementById('failedTests').textContent = failedTests;
        document.getElementById('successRate').textContent = successRate + '%';
    }

    updateProgress() {
        const progress = this.tests.length > 0 ? 
            Math.round((this.currentTestIndex / this.tests.length) * 100) : 0;
        document.getElementById('progressBar').style.width = progress + '%';
    }

    addTest(test) {
        this.tests.push(test);
    }

    renderTestResult(test, result) {
        const testResults = document.getElementById('testResults');
        
        // Clear initial message
        if (this.results.length === 1) {
            testResults.innerHTML = '';
        }

        const testItem = document.createElement('div');
        testItem.className = `test-item ${result.passed ? 'pass' : 'fail'}`;
        testItem.innerHTML = `
            <div class="test-item-name">${test.name}</div>
            <div class="test-item-status">
                ${result.passed ? '✅ PASSED' : '❌ FAILED'} - ${result.message}
                ${result.duration ? ` (${result.duration}ms)` : ''}
            </div>
        `;
        
        testResults.appendChild(testItem);
        testResults.scrollTop = testResults.scrollHeight;
    }

    updateStatus(status) {
        document.getElementById('testStatus').textContent = status;
    }

    async runTest(test) {
        this.updateStatus(`Running: ${test.name}`);
        this.log(`Starting test: ${test.name}`, 'info');
        
        const startTime = Date.now();
        let result;
        
        try {
            result = await test.run();
            const duration = Date.now() - startTime;
            
            if (!result) {
                result = {
                    passed: false,
                    message: 'Test did not return a result'
                };
            }
            
            result.duration = duration;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            result = {
                passed: false,
                message: `Error: ${error.message}`,
                duration: duration
            };
            this.log(`Test error: ${error.message}`, 'error');
        }
        
        this.results.push({
            test: test.name,
            ...result
        });
        
        this.renderTestResult(test, result);
        this.updateStats();
        this.log(`Test ${result.passed ? 'PASSED' : 'FAILED'}: ${test.name} - ${result.message}`, 
                  result.passed ? 'success' : 'error');
        
        return result;
    }

    async runAllTests() {
        if (this.isRunning) {
            this.log('Tests already running', 'warning');
            return;
        }

        this.isRunning = true;
        this.results = [];
        this.currentTestIndex = 0;
        
        // Disable buttons
        document.getElementById('runAllTests').disabled = true;
        document.getElementById('runQuickTest').disabled = true;
        
        this.log('=== Starting Test Suite ===', 'info');
        this.log(`Total tests to run: ${this.tests.length}`, 'info');
        
        for (const test of this.tests) {
            this.currentTestIndex++;
            this.updateProgress();
            await this.runTest(test);
            
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.updateStatus('Completed');
        this.updateProgress();
        
        const passedCount = this.results.filter(r => r.passed).length;
        const totalCount = this.results.length;
        
        this.log(`=== Test Suite Completed ===`, 'info');
        this.log(`Results: ${passedCount}/${totalCount} tests passed`, 
                  passedCount === totalCount ? 'success' : 'warning');
        
        // Enable buttons
        document.getElementById('runAllTests').disabled = false;
        document.getElementById('runQuickTest').disabled = false;
        
        this.isRunning = false;
    }

    async runQuickTest() {
        if (this.tests.length === 0) {
            this.log('No tests available', 'warning');
            return;
        }

        this.log('=== Running Quick Test ===', 'info');
        await this.runTest(this.tests[0]);
    }

    clearResults() {
        this.results = [];
        this.currentTestIndex = 0;
        
        document.getElementById('testResults').innerHTML = `
            <div class="test-item">
                <div class="test-item-name">Results cleared</div>
                <div class="test-item-status">Click "Chạy Tất Cả Tests" để bắt đầu</div>
            </div>
        `;
        
        document.getElementById('consoleOutput').innerHTML = `
            <div class="console-line info">Results cleared. Ready for new test run...</div>
        `;
        
        this.updateStats();
        this.updateStatus('Ready');
        document.getElementById('progressBar').style.width = '0%';
        
        this.log('Test results cleared', 'info');
    }

    clearConsole() {
        document.getElementById('consoleOutput').innerHTML = '';
        this.log('Console cleared', 'info');
    }

    openMainApp() {
        window.open('http://localhost:8000', '_blank');
        this.log('Opening Money Tracker in new tab', 'info');
    }
}

// Global test runner instance
window.testRunner = new TestRunner();