// Search functionality
(function() {
    let searchData = null;
    let searchIndex = null;
    let searchConfig = null;
    
    // Initialize search when page loads
    document.addEventListener('DOMContentLoaded', function() {
        loadSearchConfig();
        loadSearchData();
        initializeSearchInputs();
    });
    
    // Load search configuration from meta tags
    function loadSearchConfig() {
        const minQueryLengthMeta = document.querySelector('meta[name="search-min-query-length"]');
        const fuzzyThresholdMeta = document.querySelector('meta[name="search-fuzzy-threshold"]');
        const maxResultsMeta = document.querySelector('meta[name="search-max-results"]');
        
        searchConfig = {
            minQueryLength: minQueryLengthMeta ? parseInt(minQueryLengthMeta.content) : 3,
            fuzzyThreshold: fuzzyThresholdMeta ? parseFloat(fuzzyThresholdMeta.content) : 0.3,
            maxResults: maxResultsMeta ? parseInt(maxResultsMeta.content) : 8
        };
    }
    
    // Load search data
    async function loadSearchData() {
        try {
            const response = await fetch('/static/data/search.json');
            if (response.ok) {
                searchData = await response.json();
            }
        } catch (error) {
            console.warn('Search data not available:', error);
        }
    }
    
    // Initialize search inputs
    function initializeSearchInputs() {
        const searchInputs = [
            { input: document.getElementById('search-input'), results: 'search-results' },
            { input: document.getElementById('mobile-search-input'), results: 'mobile-search-results' },
            { input: document.getElementById('hero-search'), results: null }
        ];
        
        searchInputs.forEach(({ input, results }) => {
            if (input) {
                input.addEventListener('input', (e) => handleSearch(e, results));
                input.addEventListener('focus', () => showSearchResults(results));
                input.addEventListener('blur', () => hideSearchResults(results));
            }
        });
        
        // Close search results when clicking outside
        document.addEventListener('click', function(event) {
            ['search-results', 'mobile-search-results'].forEach(resultsId => {
                const searchResults = document.getElementById(resultsId);
                if (searchResults && !searchResults.contains(event.target)) {
                    hideSearchResults(resultsId);
                }
            });
        });
    }
    
    // Handle search input
    function handleSearch(event, resultsId = 'search-results') {
        const query = event.target.value.trim();
        
        if (query.length < searchConfig.minQueryLength) {
            hideSearchResults(resultsId);
            return;
        }
        
        if (!searchData) {
            // If search data not loaded, show basic message
            showSearchMessage('Search data loading...', resultsId);
            return;
        }
        
        // Perform search
        const results = performSearch(query);
        displaySearchResults(results, query, resultsId);
    }
    
    // Perform basic search (simple text matching for now)
    function performSearch(query) {
        if (!searchData || !searchData.apps) return [];
        
        const lowerQuery = query.toLowerCase();
        
        return searchData.apps
            .filter(app => {
                return app.name.toLowerCase().includes(lowerQuery) ||
                       app.description.toLowerCase().includes(lowerQuery) ||
                       (app.tags && app.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                       (app.categories && app.categories.some(cat => cat.toLowerCase().includes(lowerQuery)));
            })
            .slice(0, searchConfig.maxResults); // Limit to maxResults
    }
    
    // Display search results
    function displaySearchResults(results, query, resultsId = 'search-results') {
        const searchResults = document.getElementById(resultsId);
        if (!searchResults) return;
        
        if (results.length === 0) {
            showSearchMessage(`No results found for "${query}"`, resultsId);
            return;
        }
        
        const html = results.map(app => `
            <div class="search-result-item">
                <a href="/apps/${app.id}.html" class="block">
                    <div class="font-medium text-gray-900 dark:text-white">${highlightMatch(app.name, query)}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">${highlightMatch(app.description.substring(0, 100), query)}...</div>
                    ${app.stars ? `<div class="text-xs text-yellow-600 mt-1">⭐ ${app.stars}</div>` : ''}
                </a>
            </div>
        `).join('');
        
        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
    }
    
    // Show search message
    function showSearchMessage(message, resultsId = 'search-results') {
        const searchResults = document.getElementById(resultsId);
        if (!searchResults) return;
        
        searchResults.innerHTML = `
            <div class="search-result-item text-center">
                <div class="text-gray-500 dark:text-gray-400">${message}</div>
            </div>
        `;
        searchResults.classList.remove('hidden');
    }
    
    // Show search results
    function showSearchResults(resultsId = 'search-results') {
        const searchResults = document.getElementById(resultsId);
        if (searchResults && searchResults.innerHTML.trim()) {
            searchResults.classList.remove('hidden');
        }
    }
    
    // Hide search results
    function hideSearchResults(resultsId = 'search-results') {
        setTimeout(() => {
            const searchResults = document.getElementById(resultsId);
            if (searchResults) {
                searchResults.classList.add('hidden');
            }
        }, 150);
    }
    
    // Highlight search matches
    function highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
    }
    
    // Handle hero search - redirect to browse page with query
    const heroSearch = document.getElementById('hero-search');
    if (heroSearch) {
        heroSearch.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const query = event.target.value.trim();
                if (query) {
                    window.location.href = `/browse.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
})(); 