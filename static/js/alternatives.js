// Alternatives page functionality
class AlternativesPage {
    constructor() {
        this.alternativesData = window.alternativesData || {};
        this.config = window.alternativesConfig || {};
        this.filteredData = this.alternativesData;
        this.currentSort = 'alphabetical';
        this.currentPage = 1;
        this.itemsPerPage = this.config.itemsPerPage || 60;
        this.basePath = document.querySelector('meta[name="base-path"]')?.content || '';
        
        // Add sort direction tracking
        this.sortDirections = {
            'alphabetical': 'asc',
            'mostAlternatives': 'desc'
        };
        
        this.init();
    }

    init() {
        // Hide JavaScript required notification
        const jsNotification = document.getElementById('js-required-notification');
        if (jsNotification) {
            jsNotification.style.display = 'none';
        }

        if (this.enablePagination) {
            this.setupPaginationEventListeners();
        }
        this.setupEventListeners();
        this.renderAlternatives();
        this.updateCounts(); 
        this.updateSortButtons();
        this.filterSortAndRender();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('alternatives-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Sort buttons
        document.getElementById('sortAlphabetical')?.addEventListener('click', () => {
            this.setSort('alphabetical');
        });
        
        document.getElementById('sortMostAlternatives')?.addEventListener('click', () => {
            this.setSort('mostAlternatives');
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderCurrentPage();
                this.updatePagination();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(Object.keys(this.filteredData).length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderCurrentPage();
                this.updatePagination();
            }
        });
    }

    handleSearch(query) {
        const lowerQuery = query.toLowerCase().trim();
        
        if (lowerQuery === '') {
            this.filteredData = this.alternativesData;
        } else {
            this.filteredData = {};
            
            // Search in software names
            for (const [softwareName, alternatives] of Object.entries(this.alternativesData)) {
                if (softwareName.toLowerCase().includes(lowerQuery)) {
                    this.filteredData[softwareName] = alternatives;
                }
            }
        }
        
        this.currentPage = 1;
        this.renderAlternatives();
        this.updateCounts();
    }

    setSort(sortType) {
        // If clicking the same sort button, toggle direction
        if (this.currentSort === sortType) {
            this.sortDirections[sortType] = this.sortDirections[sortType] === 'asc' ? 'desc' : 'asc';
        } else {
            // If clicking a different sort button, set it as current
            this.currentSort = sortType;
        }
        
        this.updateSortButtons();
        this.currentPage = 1;
        this.renderAlternatives();
    }

    updateSortButtons() {
        const sortButtons = {
            'sortAlphabetical': 'alphabetical',
            'sortMostAlternatives': 'mostAlternatives'
        };
        
        Object.entries(sortButtons).forEach(([buttonId, sortType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                // Get the base text without any arrows
                let baseText = button.textContent.replace(/[↑↓]/g, '').trim();
                
                if (this.currentSort === sortType) {
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

    getSortedData() {
        const entries = Object.entries(this.filteredData);
        
        if (this.currentSort === 'alphabetical') {
            const direction = this.sortDirections[this.currentSort];
            return entries.sort((a, b) => {
                return direction === 'asc' ? 
                    a[0].toLowerCase().localeCompare(b[0].toLowerCase()) :
                    b[0].toLowerCase().localeCompare(a[0].toLowerCase());
            });
        } else if (this.currentSort === 'mostAlternatives') {
            const direction = this.sortDirections[this.currentSort];
            return entries.sort((a, b) => {
                return direction === 'desc' ? 
                    b[1].length - a[1].length :
                    a[1].length - b[1].length;
            });
        }
        
        return entries;
    }

    renderAlternatives() {
        const grid = document.getElementById('alternativesGrid');
        const noResults = document.getElementById('noResultsMessage');
        
        if (Object.keys(this.filteredData).length === 0) {
            grid.innerHTML = '';
            noResults.classList.remove('hidden');
            document.getElementById('paginationContainer').classList.add('hidden');
            return;
        }
        
        noResults.classList.add('hidden');
        this.renderCurrentPage();
        this.updatePagination();
    }

    renderCurrentPage() {
        const grid = document.getElementById('alternativesGrid');
        const sortedData = this.getSortedData();
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = sortedData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            grid.innerHTML = '<div class="text-center py-12 text-gray-500 dark:text-gray-400">No results found</div>';
            return;
        }
        
        grid.innerHTML = pageData.map(([softwareName, alternatives]) => 
            this.createAlternativeCard(softwareName, alternatives)
        ).join('');
    }

    createAlternativeCard(softwareName, alternatives) {
        // Get link attributes based on configuration
        const openExternalInNewTab = document.querySelector('meta[name="open-external-new-tab"]')?.content === 'true';
        const openInternalInNewTab = document.querySelector('meta[name="open-internal-new-tab"]')?.content === 'true';
        
        const getLinkAttrs = (url, isInternal = false) => {
            if (isInternal && openInternalInNewTab) {
                return ' target="_blank" rel="noopener"';
            } else if (!isInternal && openExternalInNewTab) {
                return ' target="_blank" rel="noopener noreferrer"';
            }
            return '';
        };
    
        // Create alternatives using the same style as browse page
        const alternativesHtml = alternatives.slice(0, 9).map(app => {
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
    
            // Category badges (show up to 2)
            const categoriesHtml = app.categories ? app.categories.slice(0, 2).map(category => 
                `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full mr-1 mb-1">${category}</span>`
            ).join('') + (app.categories.length > 2 ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1">+${app.categories.length - 2}</span>` : '') : '';
            
            // Platform badges (show first one with colored dot)
            const platformsHtml = app.platforms && app.platforms.length > 0 ? `
                <div class="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                    <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${this.getPlatformColor(app.platforms[0])};"></div>
                    ${app.platforms[0]}
                </div>
            ` : '<div></div>';
    
            // License display with proper styling
            let licenseBadge = '';
            if (app.license && app.license.length > 0) {
                const firstLicense = app.license[0];
                const licenseText = app.license.length === 1 ? firstLicense : `${firstLicense} (+${app.license.length - 1})`;
                const isNonFree = this.isNonFreeLicense ? this.isNonFreeLicense(app.license) : false;
                const licenseClass = isNonFree 
                    ? 'inline-block text-xs px-2 py-1 ml-1 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded'
                    : 'inline-block text-xs px-2 py-1 ml-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded';
                licenseBadge = `<span class="${licenseClass}">${licenseText}</span>`;
            }
    
            return `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full flex flex-col">
                    <div class="p-4 flex flex-col flex-grow">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
                                        <a href="${this.basePath}/apps/${app.id}.html"${getLinkAttrs(`${this.basePath}/apps/${app.id}.html`, true)} class="hover:text-primary-600 dark:hover:text-primary-400">
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
                            ${this.truncateDescription(app.description, 90)}
                        </p>
                        
                        ${categoriesHtml ? `<div class="mb-3">${categoriesHtml}</div>` : ''}
                        
                        <div class="flex items-center justify-between text-xs mt-auto pt-2">
                            ${platformsHtml}
                            <a href="${this.basePath}/apps/${app.id}.html"${getLinkAttrs(`${this.basePath}/apps/${app.id}.html`, true)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                                Details →
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    
        const moreAlternativesText = alternatives.length > 9 ? 
            `<div class="text-center py-3 text-sm text-gray-500 dark:text-gray-400">
                And ${alternatives.length - 9} more alternatives...
            </div>` : '';
    
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                        ${softwareName}
                        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
                            (${alternatives.length} alternative${alternatives.length !== 1 ? 's' : ''})
                        </span>
                    </h3>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    ${alternativesHtml}
                </div>
                
                ${moreAlternativesText}
            </div>
        `;
    }

    updateCounts() {
        const visibleCount = document.getElementById('visibleCount');
        const totalCount = document.getElementById('totalCount');
        
        if (visibleCount) {
            visibleCount.textContent = Object.keys(this.filteredData).length;
        }
        
        if (totalCount) {
            totalCount.textContent = Object.keys(this.alternativesData).length;
        }
    }

    updatePagination() {
        const totalItems = Object.keys(this.filteredData).length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationContainer = document.getElementById('paginationContainer');
        
        if (totalPages > 1) {
            paginationContainer.classList.remove('hidden');
            
            document.getElementById('currentPage').textContent = this.currentPage;
            document.getElementById('totalPages').textContent = totalPages;
            
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= totalPages;
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    formatStars(stars) {
        if (stars >= 1000) {
            return (stars / 1000).toFixed(1) + 'k';
        }
        return stars.toString();
    }

    truncateDescription(description, maxLength = 100) {
        if (!description || description.length <= maxLength) {
            return description || '';
        }
        
        const truncated = description.substring(0, maxLength).trim();
        const lastSpace = truncated.lastIndexOf(' ');
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
        
        return finalText + '...';
    }

    getPlatformColor(platform) {
        // Common platform colors (GitHub-style)
        // Change this in template_helpers.py as well
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

    isNonFreeLicense(licenses) {
        if (!licenses || licenses.length === 0) return false;
        
        // Simple check for non-free licenses - TODO: Implement browse.js isNonFreeLicense()
        const nonFreeLicenses = ['⊘ Proprietary'];
        return licenses.some(license => nonFreeLicenses.includes(license));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlternativesPage();
});
