/**
 * Test Agent Initialization
 */

// Initialize test agent when page loads
window.addEventListener('load', () => {
    console.log('=== Money Tracker Test Agent Initializing ===');
    
    // Register tests
    if (window.registerValidationTests) {
        window.registerValidationTests(window.testRunner);
    }
    
    if (window.registerFunctionalTests) {
        window.registerFunctionalTests(window.testRunner);
    }
    
    console.log('Test Agent initialized with ' + window.testRunner.tests.length + ' tests');
    
    // Expose global functions
    window.runAllTests = () => window.testRunner.runAllTests();
    window.runQuickTest = () => window.testRunner.runQuickTest();
    window.clearResults = () => window.testRunner.clearResults();
    window.clearConsole = () => window.testRunner.clearConsole();
    window.openMainApp = () => window.testRunner.openMainApp();
});