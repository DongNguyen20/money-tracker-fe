/**
 * Money Tracker — API Service Layer
 */

window.ApiService = {
    baseUrl: 'http://localhost:8081/api/v1',
    apiKey: 'dev-api-key-12345', // API key that works with backend

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Only add API key if it's configured
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error: ${response.status} - ${error}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Category API methods
    category: {
        async getAll(type = null) {
            const params = type ? `?type=${type}` : '';
            return await ApiService.request(`/categories${params}`);
        },

        async getById(id) {
            return await ApiService.request(`/categories/${id}`);
        },

        async getByCode(code) {
            return await ApiService.request(`/categories/by-code/${code}`);
        },

        async create(categoryData) {
            return await ApiService.request('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
        },

        async update(id, categoryData) {
            return await ApiService.request(`/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
        },

        async delete(id) {
            return await ApiService.request(`/categories/${id}`, {
                method: 'DELETE'
            });
        }
    }
};