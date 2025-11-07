// Test utility to simulate code expiration
export function testCodeExpiration() {
  try {
    // Get current active code
    const activeCode = localStorage.getItem('active_code');
    if (!activeCode) {
      console.log('No active code found');
      return false;
    }

    // Get the code data
    const codeData = localStorage.getItem(`code_${activeCode}`);
    if (!codeData) {
      console.log('No code data found');
      return false;
    }

    const data = JSON.parse(codeData);
    
    // Simulate expiration by setting expiresAt to past
    data.expiresAt = Date.now() - 1000; // 1 second ago
    
    // Save the modified data
    localStorage.setItem(`code_${activeCode}`, JSON.stringify(data));
    
    console.log('Code expiration simulated successfully');
    return true;
  } catch (error) {
    console.error('Error simulating code expiration:', error);
    return false;
  }
}

// Function to test the validation flow
export function testValidationFlow() {
  try {
    // Test 1: Check if code exists
    const activeCode = localStorage.getItem('active_code');
    console.log('Active code:', activeCode);
    
    // Test 2: Check code expiration
    const { checkCodeExpiration } = require('./codes');
    const result = checkCodeExpiration();
    console.log('Code expiration check:', result);
    
    // Test 3: Simulate expiration and check again
    if (testCodeExpiration()) {
      const expiredResult = checkCodeExpiration();
      console.log('After expiration simulation:', expiredResult);
    }
    
    return true;
  } catch (error) {
    console.error('Error in validation flow test:', error);
    return false;
  }
}