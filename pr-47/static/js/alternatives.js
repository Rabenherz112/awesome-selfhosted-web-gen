// Alternatives page functionality
class AlternativesPage {
    constructor() {
        this.alternatives = {};
        this.allSoftwareNames = [];
        this.filteredAlternatives = {};
        this.statistics = {};
        this.basePath = document.querySelector('meta[name="base-path"]')?.content || '';
        
        // Sort direction tracking
        this.sortDirections = {
            'name': 'asc',      // asc = A-Z, desc = Z-A
            'alternatives': 'desc'  // desc = most first, asc = least first
        };
        
        this.currentSort = 'name';
        
        // Configuration settings
        this.alternativesDescriptionLength = 80;
        this.alternativesDescriptionFull = false;
        this.alternativesMaxCategoriesPerCard = 2;
        this.alternativesMaxPlatformsPerCard = 3;
        this.alternativesShowMoreThreshold = 3;
        
        // Non-free licenses tracking
        this.nonFreeLicenses = new Set();
        
        // Pagination settings
        this.currentPage = 1;
        this.itemsPerPage = 60;
        this.totalPages = 1;
        this.enablePagination = true;
        
        this.init();
    }

    async init() {
        await this.loadAlternativesData();
        await this.loadLicenseData();
        await this.loadConfig();
        this.setupEventListeners();
        this.updateSortButtons('sortAlphabetical');
        this.renderAllAlternatives();
        this.parseUrlParameters();
    }

    async loadConfig() {
        // Helper function to get config value from meta tag with fallback
        const getConfigValue = (metaName, defaultValue, parser = parseInt) => {
            const meta = document.querySelector(`meta[name="${metaName}"]`);
            return meta ? parser(meta.content) || defaultValue : defaultValue;
        };

        try {
            // Load all configuration values using the helper function
            this.alternativesDescriptionLength = getConfigValue('alternatives-description-length', 80);
            this.alternativesDescriptionFull = getConfigValue('alternatives-description-full', false, (val) => val.toLowerCase() === 'true');
            this.alternativesMaxCategoriesPerCard = getConfigValue('alternatives-max-categories-per-card', 2);
            this.alternativesMaxPlatformsPerCard = getConfigValue('alternatives-max-platforms-per-card', 3);
            this.alternativesShowMoreThreshold = getConfigValue('alternatives-show-more-threshold', 3);
            this.minQueryLength = getConfigValue('search-min-query-length', 3);
            this.searchMaxResults = getConfigValue('search-max-results', 8);
            this.searchFuzzyThreshold = getConfigValue('search-fuzzy-threshold', 0.3);
            this.itemsPerPage = getConfigValue('items-per-page', 60);
            this.enablePagination = getConfigValue('enable-pagination', false, (val) => val.toLowerCase() === 'true');
        } catch (error) {
            console.log('Using default configuration values');
        }
    }

    async loadLicenseData() {
        // Load non-free license identifiers from search data
        try {
            const response = await fetch(this.basePath + '/static/data/search.json');
            const data = await response.json();
            
            if (data.nonfree_licenses && Array.isArray(data.nonfree_licenses)) {
                data.nonfree_licenses.forEach(license => {
                    this.nonFreeLicenses.add(license);
                });
            } else {
                // Fallback to basic proprietary check if data not available
                this.nonFreeLicenses.add('⊘ Proprietary');
            }
        } catch (error) {
            console.error('Failed to load license data:', error);
            // Fallback to basic proprietary check
            this.nonFreeLicenses.add('⊘ Proprietary');
        }
    }

    async loadAlternativesData() {
        try {
            const response = await fetch(this.basePath + '/static/data/alternatives.json');
            const data = await response.json();
            this.alternatives = data.alternatives || {};
            this.statistics = data.statistics || {};
            
            // Create list of all software names for search suggestions
            this.allSoftwareNames = Object.keys(this.alternatives).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            this.filteredAlternatives = { ...this.alternatives };
        } catch (error) {
            console.error('Failed to load alternatives data:', error);
            this.showError('Failed to load alternatives data. Please try again later.');
        }
    }

    setupEventListeners() {
        // Search functionality
        const heroSearch = document.getElementById('alternatives-search');
        const searchSuggestions = document.getElementById('searchSuggestions');
        
        if (heroSearch) {
            // Search input handler
            heroSearch.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                this.handleSearchInput(query);
            });

            // Handle focus to show suggestions
            heroSearch.addEventListener('focus', (e) => {
                const query = e.target.value.trim();
                if (query && query.length >= this.minQueryLength) {
                    this.showSearchSuggestions(query);
                }
            });

            // Handle blur to hide suggestions (with delay to allow clicking)
            heroSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    this.hideSearchSuggestions();
                }, 200);
            });

            // Handle keyboard navigation
            heroSearch.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });
        }

        // Click outside to hide suggestions - only if both elements exist
        if (heroSearch && searchSuggestions) {
            document.addEventListener('click', (e) => {
                if (!heroSearch.contains(e.target) && !searchSuggestions.contains(e.target)) {
                    this.hideSearchSuggestions();
                }
            });
        }

        // Handle hash changes (when user navigates back/forward or clicks another hash link)
        window.addEventListener('hashchange', () => {
            this.parseUrlParameters();
        });

        // Sort buttons
        const sortButtons = {
            'sortAlphabetical': 'name',
            'sortMostAlternatives': 'alternatives'
        };

        Object.entries(sortButtons).forEach(([buttonId, sortType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    // If clicking the same sort button, toggle direction
                    if (this.currentSort === sortType) {
                        this.sortDirections[sortType] = this.sortDirections[sortType] === 'asc' ? 'desc' : 'asc';
                    } else {
                        // If clicking a different sort button, set it as current
                        this.currentSort = sortType;
                    }
                    
                    this.updateSortButtons(buttonId);
                    this.currentPage = 1; // Reset to first page on sort
                    this.renderAlternatives();
                });
            }
        });
    }

    updateSortButtons(activeButtonId) {
        const sortButtons = {
            'sortAlphabetical': 'name',
            'sortMostAlternatives': 'alternatives'
        };
        
        Object.entries(sortButtons).forEach(([buttonId, sortType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                // Get the base text without any arrows
                let baseText = button.textContent.replace(/[↑↓]/g, '').trim();
                
                if (buttonId === activeButtonId) {
                    button.className = 'sort-button active';
                    // Add arrow indicator based on current direction
                    const direction = this.sortDirections[sortType];
                    const arrow = direction === 'asc' ? '↑' : '↓';
                    button.textContent = `${baseText} ${arrow}`;
                } else {
                    button.className = 'sort-button';
                    button.textContent = baseText;
                }
            }
        });
    }

    handleSearchInput(query) {
        if (query.length === 0) {
            // Show all alternatives when search is empty
            this.filteredAlternatives = { ...this.alternatives };
            this.hideSearchSuggestions();
        } else if (query.length >= this.minQueryLength) {
            // Show search suggestions
            this.showSearchSuggestions(query);
            // Filter alternatives based on query
            this.filterAlternatives(query);
        } else {
            this.hideSearchSuggestions();
        }
        
        this.currentPage = 1; // Reset to first page on search
        this.renderAlternatives();
    }

    showSearchSuggestions(query) {
        const suggestions = this.getSuggestions(query);
        const suggestionsContainer = document.getElementById('searchSuggestions');
        
        if (!suggestionsContainer) {
            console.warn('Search suggestions container not found');
            return;
        }
        
        if (suggestions.length === 0) {
            this.hideSearchSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = '';
        
        suggestions.slice(0, this.searchMaxResults).forEach((suggestion, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between';
            suggestionElement.setAttribute('data-index', index);
            
            const alternativesCount = this.alternatives[suggestion] ? this.alternatives[suggestion].length : 0;
            
            suggestionElement.innerHTML = `
                <span class="text-gray-900 dark:text-white">${this.highlightMatch(suggestion, query)}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">${alternativesCount} alternative${alternativesCount !== 1 ? 's' : ''}</span>
            `;
            
            suggestionElement.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });
            
            suggestionsContainer.appendChild(suggestionElement);
        });
        
        suggestionsContainer.classList.remove('hidden');
    }

    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }

    getSuggestions(query) {
        const lowerQuery = query.toLowerCase();
        return this.allSoftwareNames.filter(name => 
            name.toLowerCase().includes(lowerQuery)
        ).sort((a, b) => {
            // Prioritize exact matches and starts-with matches
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            
            const aStartsWith = aLower.startsWith(lowerQuery);
            const bStartsWith = bLower.startsWith(lowerQuery);
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // Then sort by length (shorter first)
            if (a.length !== b.length) {
                return a.length - b.length;
            }
            
            // Finally sort alphabetically
            return a.localeCompare(b);
        });
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    selectSuggestion(suggestion) {
        const heroSearch = document.getElementById('alternatives-search');
        if (!heroSearch) {
            console.warn('Search input element not found');
            return;
        }
        
        heroSearch.value = suggestion;
        this.hideSearchSuggestions();
        this.filterAlternatives(suggestion);
        this.currentPage = 1; // Reset to first page
        this.renderAlternatives();
    }

    handleKeyboardNavigation(e) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer || suggestionsContainer.classList.contains('hidden')) return;

        const suggestions = suggestionsContainer.querySelectorAll('[data-index]');
        const currentActive = suggestionsContainer.querySelector('.bg-gray-100, .dark\\:bg-gray-700');
        let currentIndex = currentActive ? parseInt(currentActive.getAttribute('data-index')) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions, currentIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                this.highlightSuggestion(suggestions, currentIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && suggestions[currentIndex]) {
                    const suggestionText = suggestions[currentIndex].querySelector('span').textContent;
                    this.selectSuggestion(suggestionText);
                }
                break;
            case 'Escape':
                this.hideSearchSuggestions();
                break;
        }
    }

    highlightSuggestion(suggestions, index) {
        if (!suggestions || suggestions.length === 0) return;
        
        suggestions.forEach((suggestion, i) => {
            if (i === index) {
                suggestion.classList.add('bg-gray-100', 'dark:bg-gray-700');
            } else {
                suggestion.classList.remove('bg-gray-100', 'dark:bg-gray-700');
            }
        });
    }

    filterAlternatives(query) {
        const lowerQuery = query.toLowerCase();
        this.filteredAlternatives = {};
        
        Object.keys(this.alternatives).forEach(softwareName => {
            if (softwareName.toLowerCase().includes(lowerQuery)) {
                this.filteredAlternatives[softwareName] = this.alternatives[softwareName];
            }
        });
    }

    updateStatistics() {
        // Only update the results count display, not the statistics cards
        const totalSoftware = Object.keys(this.filteredAlternatives).length;
        
        // Update the visible count and total count for filtered results
        const visibleCount = document.getElementById('visibleCount');
        const totalCount = document.getElementById('totalCount');
        if (visibleCount) visibleCount.textContent = totalSoftware;
        if (totalCount) totalCount.textContent = totalSoftware;
    }

    renderAllAlternatives() {
        this.filteredAlternatives = { ...this.alternatives };
        this.renderAlternatives();
        // Update statistics to reflect the current filtered state
        this.updateStatistics();
    }

    renderAlternatives() {
        const container = document.getElementById('alternativesGrid');
        const loadingMessage = document.getElementById('loadingMessage');
        const noResultsMessage = document.getElementById('noResultsMessage');
        
        // Hide loading message
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }

        // Check if we have results
        const hasResults = Object.keys(this.filteredAlternatives).length > 0;
        
        if (!hasResults) {
            container.innerHTML = '';
            noResultsMessage.classList.remove('hidden');
            // Update statistics to show 0 results
            this.updateStatistics();
            if (this.enablePagination) {
                const paginationContainer = document.getElementById('paginationContainer');
                if (paginationContainer) paginationContainer.classList.add('hidden');
            }
            return;
        }

        noResultsMessage.classList.add('hidden');
        
        // Clear container
        container.innerHTML = '';

        // Sort software names based on current sort
        const sortedSoftwareNames = this.sortSoftwareNames(Object.keys(this.filteredAlternatives));

        // Calculate pagination
        this.totalPages = Math.ceil(sortedSoftwareNames.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        // Get software names for current page (or all if pagination disabled)
        let pageSoftwareNames;
        if (this.enablePagination) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, sortedSoftwareNames.length);
            pageSoftwareNames = sortedSoftwareNames.slice(startIndex, endIndex);
        } else {
            pageSoftwareNames = sortedSoftwareNames;
        }

        // Render each software group
        pageSoftwareNames.forEach(softwareName => {
            const alternatives = this.filteredAlternatives[softwareName];
            const groupElement = this.createSoftwareGroup(softwareName, alternatives);
            container.appendChild(groupElement);
        });

        // Update statistics to reflect current filtered state
        this.updateStatistics();
        
        // Update pagination controls
        if (this.enablePagination) {
            this.updatePaginationControls();
        }
    }

    sortSoftwareNames(softwareNames) {
        return softwareNames.sort((a, b) => {
            const sortType = this.currentSort;
            const direction = this.sortDirections[sortType];
            let comparison = 0;

            switch (sortType) {
                case 'alternatives':
                    const alternativesA = this.filteredAlternatives[a] ? this.filteredAlternatives[a].length : 0;
                    const alternativesB = this.filteredAlternatives[b] ? this.filteredAlternatives[b].length : 0;
                    comparison = direction === 'asc' ? alternativesA - alternativesB : alternativesB - alternativesA;
                    break;
                case 'name':
                default:
                    comparison = direction === 'asc' ? 
                        a.localeCompare(b) : 
                        b.localeCompare(a);
                    break;
            }
            
            return comparison;
        });
    }

    createSoftwareGroup(softwareName, alternatives) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow duration-300 mb-8 mt-4';

        // Create header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'mb-6';
        
        const title = document.createElement('h2');
        title.className = 'text-2xl font-bold text-gray-900 dark:text-white mb-2';
        title.textContent = softwareName;
        
        const subtitle = document.createElement('p');
        subtitle.className = 'text-gray-600 dark:text-gray-300';
        subtitle.textContent = `${alternatives.length} alternative${alternatives.length !== 1 ? 's' : ''}`;
        
        headerDiv.appendChild(title);
        headerDiv.appendChild(subtitle);
        
        // Create alternatives grid
        const gridDiv = document.createElement('div');
        gridDiv.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        
        // Show only first N alternatives initially, or all if N or fewer
        const alternativesToShow = alternatives.slice(0, this.alternativesShowMoreThreshold);
        
        alternativesToShow.forEach(app => {
            const appCard = this.createApplicationCard(app);
            gridDiv.appendChild(appCard);
        });
        
        // Add "Show More" button if there are more than threshold alternatives
        if (alternatives.length > this.alternativesShowMoreThreshold) {
            const showMoreDiv = document.createElement('div');
            showMoreDiv.className = 'mt-4 text-center';
            
            const remainingCount = alternatives.length - this.alternativesShowMoreThreshold;
            const showMoreButton = document.createElement('button');
            showMoreButton.className = 'px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors';
            showMoreButton.textContent = `Show ${remainingCount} more alternative${remainingCount !== 1 ? 's' : ''}`;
            
            showMoreButton.addEventListener('click', () => {
                // Add remaining alternatives
                const remainingAlternatives = alternatives.slice(this.alternativesShowMoreThreshold);
                remainingAlternatives.forEach(app => {
                    const appCard = this.createApplicationCard(app);
                    gridDiv.appendChild(appCard);
                });
                
                // Remove show more button
                showMoreDiv.remove();
            });
            
            showMoreDiv.appendChild(showMoreButton);
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(gridDiv);
            groupDiv.appendChild(showMoreDiv);
        } else {
            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(gridDiv);
        }
        
        return groupDiv;
    }

    createApplicationCard(app) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col border border-gray-200 dark:border-gray-700';

        const openExternalInNewTab = document.querySelector('meta[name="open-external-new-tab"]')?.content === 'true' || false;
        const openInternalInNewTab = document.querySelector('meta[name="open-internal-new-tab"]')?.content === 'true' || false;

        // Helper function to get target attributes
        const getLinkAttrs = (url, isInternal = null) => {
            if (isInternal === null) {
                isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
            }

            if (isInternal && openInternalInNewTab) {
                return ' target="_blank" rel="noopener"';
            } else if (isInternal && !openInternalInNewTab) {
                return ' target="_self"';
            } else if (!isInternal && openExternalInNewTab) {
                return ' target="_blank" rel="noopener noreferrer"';
            } else if (!isInternal && !openExternalInNewTab) {
                return ' target="_self" rel="noreferrer"';
            }
            return '';
        };
        
        const dependsIcon = app.depends_3rdparty ? `
            <div class="flex-shrink-0" title="Depends on a proprietary service outside the user's control">
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
            </div>
        ` : '';

        const docLanguageIcon = app.documentation_language && Array.isArray(app.documentation_language) && app.documentation_language.length > 0 ? `
            <div class="flex items-center text-orange-500 flex-shrink-0" title="Documentation only in ${app.documentation_language.join(', ')}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                </svg>
            </div>
        ` : '';

        const starsIcon = app.stars ? `
            <div class="flex items-center text-yellow-500 flex-shrink-0" title="Repository stars">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span class="text-xs font-medium">${this.formatStars(app.stars)}</span>
            </div>
        ` : '';

        const days = this.getDaysSinceUpdate(app.last_updated);
        const clockIcon = days !== null ? `
            <div class="flex items-center ${this.getUpdateAgeColor(days)} flex-shrink-0" title="Last updated ${days} day${days === 1 ? '' : 's'} ago${app.last_updated ? ' (' + app.last_updated + ')' : ''}">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
                <span class="text-xs font-medium">${days}d</span>
            </div>
        ` : '';

        const forkIcon = app.fork_of ? `
            <div class="flex-shrink-0" title="Fork of ${app.fork_of}">
                <svg class="w-4 h-4 text-blue-500" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M13.273 7.73a2.51 2.51 0 0 0-3.159-.31 2.5 2.5 0 0 0-.921 1.12 2.23 2.23 0 0 0-.13.44 4.52 4.52 0 0 1-4-4 2.23 2.23 0 0 0 .44-.13 2.5 2.5 0 0 0 1.54-2.31 2.45 2.45 0 0 0-.19-1A2.48 2.48 0 0 0 5.503.19a2.45 2.45 0 0 0-1-.19 2.5 2.5 0 0 0-2.31 1.54 2.52 2.52 0 0 0 .54 2.73c.35.343.79.579 1.27.68v5.1a2.411 2.411 0 0 0-.89.37 2.5 2.5 0 1 0 3.47 3.468 2.5 2.5 0 0 0 .42-1.387 2.45 2.45 0 0 0-.19-1 2.48 2.48 0 0 0-1.81-1.49v-2.4a5.52 5.52 0 0 0 2 1.73 5.65 5.65 0 0 0 2.09.6 2.5 2.5 0 0 0 4.95-.49 2.51 2.51 0 0 0-.77-1.72zm-8.2 3.38c.276.117.512.312.68.56a1.5 1.5 0 0 1-2.08 2.08 1.55 1.55 0 0 1-.56-.68 1.49 1.49 0 0 1-.08-.86 1.49 1.49 0 0 1 1.18-1.18 1.49 1.49 0 0 1 .86.08zM4.503 4a1.5 1.5 0 0 1-1.39-.93 1.49 1.49 0 0 1-.08-.86 1.49 1.49 0 0 1 1.18-1.18 1.49 1.49 0 0 1 .86.08A1.5 1.5 0 0 1 4.503 4zm8.06 6.56a1.5 1.5 0 0 1-2.45-.49 1.49 1.49 0 0 1-.08-.86 1.49 1.49 0 0 1 1.18-1.18 1.49 1.49 0 0 1 .86.08 1.499 1.499 0 0 1 .49 2.45z"/>
                </svg>
            </div>
        ` : '';

        // Category badges (show up to configured limit)
        const categoriesHtml = app.categories ? app.categories.slice(0, this.alternativesMaxCategoriesPerCard).map(category => 
            `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full mr-1 mb-1">${category}</span>`
        ).join('') + (app.categories.length > this.alternativesMaxCategoriesPerCard ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1">+${app.categories.length - this.alternativesMaxCategoriesPerCard}</span>` : '') : '';
        
        // Platform badges (show up to configured limit)
        const platformsHtml = app.platforms && app.platforms.length > 0 ? app.platforms.slice(0, this.alternativesMaxPlatformsPerCard).map(platform => {
            const color = this.getPlatformColor(platform);
            return `<span class="inline-flex items-center text-gray-500 dark:text-gray-400 text-xs mr-2 mb-1">
                <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${color};"></div>
                ${platform}
            </span>`;
        }).join('') + (app.platforms.length > this.alternativesMaxPlatformsPerCard ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded mr-1 mb-1">+${app.platforms.length - this.alternativesMaxPlatformsPerCard}</span>` : '') : '';

        // License display (first license + count if multiple)
        let licenseBadge = '';
        let licenseText = '';
        let licenseClass = '';
        if (app.license && app.license.length > 0) {
            const firstLicense = app.license[0];
            if (app.license.length === 1) {
                licenseText = firstLicense;
            } else {
                licenseText = `${firstLicense} (+${app.license.length - 1})`;
            }
            
            // Check if it's a non-free license
            const isNonFree = this.isNonFreeLicense(app.license);
            if (isNonFree) {
                licenseClass = 'inline-block text-xs px-2 py-1 ml-1 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded';
            } else {
                licenseClass = 'inline-block text-xs px-2 py-1 ml-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded';
            }
            licenseBadge = `<span class="${licenseClass}">${licenseText}</span>`;
        };

        // Only show buttons when they have valid URLs
        const demoLink = (app.demo_url && app.demo_url.trim()) ? `
            <a href="${app.demo_url}"${getLinkAttrs(app.demo_url, false)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                Demo
            </a>
        ` : '';

        const sourceLink = (app.repo_url && app.repo_url.trim()) ? `
        <a href="${app.repo_url}"${getLinkAttrs(app.repo_url, false)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
            Source
        </a>
        ` : '';

        // Only show website link if it exists and is different from the source code URL
        const websiteLink = (app.url && app.url.trim() && app.url !== app.repo_url && app.url !== app.demo_url) ? `
        <a href="${app.url}"${getLinkAttrs(app.url, false)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
            Website
        </a>
        ` : '';

        // Details link (internal)
        const detailsLink = `
        <a href="${this.basePath}/apps/${app.id}.html"${getLinkAttrs(`${this.basePath}/apps/${app.id}.html`, true)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
            Details
        </a>
        `;

        card.innerHTML = `
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                <a href="${this.basePath}/apps/${app.id}.html" class="hover:text-primary-600 dark:hover:text-primary-400">
                                    ${app.name}
                                </a>
                            </h3>
                            ${licenseBadge}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 ml-2">
                        ${dependsIcon}
                        ${docLanguageIcon}
                        ${starsIcon}
                        ${clockIcon}
                        ${forkIcon}
                    </div>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 flex-grow">
                    ${this.truncateDescription(app.description)}
                </p>
                
                ${categoriesHtml ? `<div class="mb-1">${categoriesHtml}</div>` : ''}
                ${platformsHtml ? `<div class="mb-2">${platformsHtml}</div>` : ''}
                
                <div class="flex items-end justify-between text-xs mt-auto pt-1">
                    <div class="flex flex-wrap gap-2">
                        ${websiteLink}
                        ${sourceLink}
                        ${demoLink}
                        ${detailsLink}
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }

    // Helper methods
    getPlatformColor(platform) {
        // Common platform colors (GitHub-style)
        const colors = {
            'python': '#3572A5',
            'javascript': '#f1e05a',
            'typescript': '#2b7489',
            'java': '#b07219',
            'go': '#00ADD8',
            'rust': '#dea584',
            'php': '#4F5D95',
            'c': '#555555',
            'c++': '#f34b7d',
            'c#': '#239120',
            'ruby': '#701516',
            'shell': '#89e051',
            'docker': '#384d54',
            'html': '#e34c26',
            'css': '#563d7c',
            'vue': '#4FC08D',
            'react': '#61DAFB',
            'nodejs': '#43853d',
            'dart': '#00B4AB',
            'kotlin': '#F18E33',
            'swift': '#FA7343',
            'scala': '#c22d40'
        };
        
        if (!platform) {
            return '#6b7280'; // gray-500
        }
        
        return colors[platform.toLowerCase()] || '#6b7280';
    }

    formatStars(stars) {
        if (stars >= 1000) {
            return (stars / 1000).toFixed(1) + 'k';
        }
        return stars.toString();
    }

    getDaysSinceUpdate(lastUpdated) {
        if (!lastUpdated) return null;
        
        const updateDate = new Date(lastUpdated);
        const today = new Date();
        const diffTime = Math.abs(today - updateDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    getUpdateAgeColor(days) {
        if (days === null || days === undefined) return 'text-gray-500';
        if (days > 365) return 'text-red-500';
        if (days > 180) return 'text-yellow-500';
        return 'text-green-500';
    }

    truncateDescription(description, maxLength = null) {
        if (!description) return '';
        
        if (maxLength === null) {
            maxLength = this.alternativesDescriptionLength;
        }
        if (this.alternativesDescriptionFull || description.length <= maxLength) {
            return description;
        }
        
        const truncated = description.substring(0, maxLength).trim();
        const lastSpace = truncated.lastIndexOf(' ');
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
        
        return finalText + '...';
    }

    isNonFreeLicense(licenses) {
        if (!licenses || licenses.length === 0) return false;
        
        // A license is non-free if it IS in the non-free licenses set
        return licenses.some(license => 
            this.nonFreeLicenses.has(license)
        );
    }

    parseUrlParameters() {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            // Remove the # and decode any URL encoding
            const searchTerm = decodeURIComponent(hash.substring(1));
            
            // Set the search input value
            const heroSearch = document.getElementById('alternatives-search');
            if (heroSearch) {
                heroSearch.value = searchTerm;
                
                // Trigger the search
                this.filterAlternatives(searchTerm);
                this.currentPage = 1; // Reset to first page
                this.renderAlternatives();
                
                // Scroll to the search input
                heroSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Pagination methods
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.renderAlternatives();
            if (this.enablePagination) {
                this.updatePaginationControls();
            }
        }
    }

    generatePageRange() {
        const pages = [];
        const totalPages = this.totalPages;
        const currentPage = this.currentPage;
        
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            if (currentPage <= 3) {
                // Near the start: 1, 2, 3, 4, ..., last
                pages.push(2, 3, 4);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                // Near the end: 1, ..., last-3, last-2, last-1, last
                pages.push('...');
                pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                // In the middle: 1, ..., current-1, current, current+1, ..., last
                pages.push('...');
                pages.push(currentPage - 1, currentPage, currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    }

    updatePaginationControls() {
        const paginationContainer = document.getElementById('paginationContainer');
        const currentPageElement = document.getElementById('currentPage');
        const totalPagesElement = document.getElementById('totalPages');
        const paginationButtons = document.getElementById('paginationButtons');

        if (this.totalPages > 1) {
            paginationContainer.classList.remove('hidden');

            if (currentPageElement) currentPageElement.textContent = this.currentPage;
            if (totalPagesElement) totalPagesElement.textContent = this.totalPages;

            // Generate pagination buttons
            if (paginationButtons) {
                paginationButtons.innerHTML = '';
                
                const buttonBaseClass = 'px-3 py-2 text-sm font-medium rounded transition-colors';
                const activeClass = `${buttonBaseClass} bg-primary-600 text-white`;
                const inactiveClass = `${buttonBaseClass} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600`;
                const disabledClass = `${buttonBaseClass} bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed`;
                const ellipsisClass = 'px-2 py-2 text-sm text-gray-500 dark:text-gray-400';

                // Previous button («)
                const prevButton = document.createElement('button');
                prevButton.innerHTML = '&laquo;';
                prevButton.title = 'Previous page';
                prevButton.className = this.currentPage <= 1 ? disabledClass : inactiveClass;
                prevButton.disabled = this.currentPage <= 1;
                prevButton.addEventListener('click', () => this.goToPage(this.currentPage - 1));
                paginationButtons.appendChild(prevButton);

                // Page number buttons
                const pageRange = this.generatePageRange();
                pageRange.forEach(page => {
                    if (page === '...') {
                        const ellipsis = document.createElement('span');
                        ellipsis.className = ellipsisClass;
                        ellipsis.textContent = '…';
                        paginationButtons.appendChild(ellipsis);
                    } else {
                        const pageButton = document.createElement('button');
                        pageButton.textContent = page;
                        pageButton.className = page === this.currentPage ? activeClass : inactiveClass;
                        pageButton.addEventListener('click', () => this.goToPage(page));
                        paginationButtons.appendChild(pageButton);
                    }
                });

                // Next button (»)
                const nextButton = document.createElement('button');
                nextButton.innerHTML = '&raquo;';
                nextButton.title = 'Next page';
                nextButton.className = this.currentPage >= this.totalPages ? disabledClass : inactiveClass;
                nextButton.disabled = this.currentPage >= this.totalPages;
                nextButton.addEventListener('click', () => this.goToPage(this.currentPage + 1));
                paginationButtons.appendChild(nextButton);
            }
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    showError(message) {
        const container = document.getElementById('alternativesGrid');
        const loadingMessage = document.getElementById('loadingMessage');
        
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }

        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-red-500 dark:text-red-400">
                    <svg class="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Alternatives</h3>
                    <p class="text-gray-500 dark:text-gray-400">${message}</p>
                </div>
            </div>
        `;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlternativesPage();
});
