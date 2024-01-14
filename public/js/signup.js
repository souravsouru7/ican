function validateForm() {
    // Reset error messages
    document.getElementById('nameError').innerHTML = '';
    document.getElementById('emailError').innerHTML = '';
    document.getElementById('mobileError').innerHTML = '';
    document.getElementById('passwordError').innerHTML = '';
    document.getElementById('repasswordError').innerHTML = '';

    // Get form input values
    var name = document.getElementById('name').value;
    var email = document.getElementById('email').value;
    var mobile = document.getElementById('mobile').value;
    var password = document.getElementById('password').value;
    var repassword = document.getElementById('repassword').value;

    // Basic validation (you can add more specific validation as needed)
    if (name.trim() === '') {
        document.getElementById('nameError').innerHTML = 'Name is required';
        return false;
    }

    // Validate email format
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        document.getElementById('emailError').innerHTML = 'Please enter a valid email address';
        return false;
    }

    // Validate phone number (assuming it should be 10 digits)
    var phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(mobile)) {
        document.getElementById('mobileError').innerHTML = 'Please enter a valid 10-digit phone number';
        return false;
    }

    // Check if password and confirm password match
    if (password !== repassword) {
        document.getElementById('passwordError').innerHTML = 'Password and Confirm Password do not match';
        return false;
    }

    return true; // If all validation passes, allow the form submission
}