/**
 * Money Tracker — API Service Layer
 */

window.ApiService = {
    baseUrl: 'http://localhost:8081/api/v1',

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error: ${response.status} - ${error}`);
            }

            // Handle 204 No Content responses (DELETE operations)
            if (response.status === 204) {
                return null;
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
    },

    // Config Param API methods
    configParam: {
        async getAll() {
            return await ApiService.request('/config-params');
        },

        async search(paramKey) {
            return await ApiService.request(`/config-params/search?paramKey=${encodeURIComponent(paramKey)}`);
        },

        async getById(id) {
            return await ApiService.request(`/config-params/${id}`);
        },

        async getByKey(paramKey) {
            return await ApiService.request(`/config-params/key/${encodeURIComponent(paramKey)}`);
        },

        async create(configData) {
            return await ApiService.request('/config-params', {
                method: 'POST',
                body: JSON.stringify(configData)
            });
        },

        async update(id, configData) {
            return await ApiService.request(`/config-params/${id}`, {
                method: 'PUT',
                body: JSON.stringify(configData)
            });
        },

        async updateByKey(paramKey, configData) {
            try {
                const existing = await ApiService.request(`/config-params/key/${encodeURIComponent(paramKey)}`);
                return await ApiService.request(`/config-params/${existing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(configData)
                });
            } catch (error) {
                return await ApiService.request('/config-params', {
                    method: 'POST',
                    body: JSON.stringify({ ...configData, paramKey })
                });
            }
        },

        async delete(id) {
            return await ApiService.request(`/config-params/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Rent API methods
    rent: {
        async getAll() {
            return await ApiService.request('/rents');
        },

        async getByStatus(status) {
            return await ApiService.request(`/rents/status/${status}`);
        },

        async getByDateRange(startDate, endDate) {
            return await ApiService.request(`/rents/date-range?startDate=${startDate}&endDate=${endDate}`);
        },

        async getById(id) {
            return await ApiService.request(`/rents/${id}`);
        },

        async create(rentData) {
            return await ApiService.request('/rents', {
                method: 'POST',
                body: JSON.stringify(rentData)
            });
        },

        async update(id, rentData) {
            return await ApiService.request(`/rents/${id}`, {
                method: 'PUT',
                body: JSON.stringify(rentData)
            });
        },

        async delete(id) {
            return await ApiService.request(`/rents/${id}`, {
                method: 'DELETE'
            });
        },

        async updateStatus(id, status) {
            return await ApiService.request(`/rents/${id}/status?status=${status}`, {
                method: 'PATCH'
            });
        }
    }
};
