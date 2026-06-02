// Paste vào browser console tại http://localhost:3000
console.log('=== Debug Category Loading ===');

// Test API call trực tiếp
fetch('http://localhost:8081/api/v1/categories')
    .then(res => {
        console.log('Response status:', res.status);
        console.log('Response headers:', [...res.headers.entries()]);
        return res.json();
    })
    .then(data => {
        console.log('✅ API call successful!');
        console.log('Categories loaded:', data.length);
        console.log('Sample:', data[0]);
    })
    .catch(err => {
        console.error('❌ API call failed:', err);
    });

// Test ApiService
setTimeout(() => {
    if (window.ApiService) {
        window.ApiService.category.getAll()
            .then(data => {
                console.log('✅ ApiService successful!');
                console.log('Categories:', data.length);
            })
            .catch(err => console.error('❌ ApiService failed:', err));
    } else {
        console.error('❌ ApiService not loaded');
    }
}, 1000);