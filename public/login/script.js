document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorAlert = document.getElementById('errorAlert');
    
    try {
        const response = await fetch('/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Check if user is admin
        if (data.user.role !== 'admin') {
            throw new Error('Access denied. Admin privileges required');
        }
        
        // Store token and redirect
        localStorage.setItem('token', data.token);
        window.location.href = '/admin';
        
    } catch (error) {
        errorAlert.textContent = error.message;
        errorAlert.style.display = 'block';
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 3000);
    }
}); 