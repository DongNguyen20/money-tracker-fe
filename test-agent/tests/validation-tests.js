/**
 * Validation Tests for Money Tracker
 */

// Register validation tests with test runner
window.registerValidationTests = (runner) => {
    
    // Test 1: HTML Structure - Form has novalidate
    runner.addTest({
        name: 'Form has novalidate attribute',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/views/transactions.html');
                const html = await response.text();
                
                if (html.includes('novalidate')) {
                    return { passed: true, message: 'Form has novalidate attribute' };
                } else {
                    return { passed: false, message: 'Form missing novalidate attribute' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 2: HTML Structure - Date field outside form
    runner.addTest({
        name: 'Date field outside form tag',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/views/transactions.html');
                const html = await response.text();
                
                const formMatch = html.match(/<form[^>]*id="txnForm"[^>]*>([\s\S]*?)<\/form>/);
                if (!formMatch) {
                    return { passed: false, message: 'Cannot find form tag' };
                }
                
                const formContent = formMatch[1];
                const dateInForm = formContent.includes('id="txnDate"');
                
                if (!dateInForm) {
                    return { passed: true, message: 'Date field is correctly outside form' };
                } else {
                    return { passed: false, message: 'Date field is inside form (validation will occur)' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 3: HTML Structure - No required attributes
    runner.addTest({
        name: 'No required attributes in form',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/views/transactions.html');
                const html = await response.text();
                
                if (!html.includes('required')) {
                    return { passed: true, message: 'No required attributes found' };
                } else {
                    return { passed: false, message: 'Found required attributes (validation will occur)' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 4: HTML Structure - Button type
    runner.addTest({
        name: 'Save button has type="button"',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/views/transactions.html');
                const html = await response.text();
                
                const buttonMatch = html.match(/<button[^>]*id="txnSaveBtn"[^>]*type="([^"]*)"/);
                if (buttonMatch && buttonMatch[1] === 'button') {
                    return { passed: true, message: 'Save button has type="button"' };
                } else {
                    return { passed: false, message: 'Save button does not have type="button"' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 5: JavaScript - Date auto-fill logic exists
    runner.addTest({
        name: 'JavaScript has date auto-fill logic',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/transaction.js');
                const js = await response.text();
                
                if (js.includes('if (!date)') && js.includes('getFullYear()')) {
                    return { passed: true, message: 'Date auto-fill logic exists' };
                } else {
                    return { passed: false, message: 'Date auto-fill logic missing' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 6: JavaScript - Double event handlers
    runner.addTest({
        name: 'JavaScript has double event handlers',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/transaction.js');
                const js = await response.text();
                
                const hasFormSubmit = js.includes('addEventListener("submit"') || js.includes('addEventListener(\'submit\'')');
                const hasButtonClick = js.includes('addEventListener("click"') || js.includes('addEventListener(\'click\'')');
                
                if (hasFormSubmit && hasButtonClick) {
                    return { passed: true, message: 'Both form submit and button click handlers present' };
                } else {
                    return { passed: false, message: 'Missing one or both event handlers' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    // Test 7: JavaScript - Debug logging
    runner.addTest({
        name: 'JavaScript has debug console logs',
        run: async () => {
            try {
                const response = await fetch('http://localhost:8000/transaction.js');
                const js = await response.text();
                
                if (js.includes('console.log')) {
                    return { passed: true, message: 'Debug logging is present' };
                } else {
                    return { passed: false, message: 'Debug logging is missing' };
                }
            } catch (error) {
                throw error;
            }
        }
    });

    runner.log('✅ Registered 7 validation tests', 'success');
};