// Alternatives page functionality
class AlternativesPage {
    constructor() {
        this.alternativesData = window.alternativesData || {};
        this.config = window.alternativesConfig || {};
        this.filteredData = this.alternativesData;
        this.currentSort = 'alphabetical';
        this.currentPage = 1;
        this.itemsPerPage = this.config.itemsPerPage || 60; // Use generation.items_per_page default
        this.basePath = document.querySelector('meta[name="base-path"]')?.content || '';
        
        this.init();
    }

    init() {
        // Hide JavaScript required notification
        const jsNotification = document.getElementById('js-required-notification');
        if (jsNotification) {
            jsNotification.style.display = 'none';
        }

        this.setupEventListeners();
        this.renderAlternatives();
        this.updateCounts();
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
        this.currentSort = sortType;
        
        // Update button states
        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (sortType === 'alphabetical') {
            document.getElementById('sortAlphabetical').classList.add('active');
        } else if (sortType === 'mostAlternatives') {
            document.getElementById('sortMostAlternatives').classList.add('active');
        }
        
        this.currentPage = 1;
        this.renderAlternatives();
    }

    getSortedData() {
        const entries = Object.entries(this.filteredData);
        
        if (this.currentSort === 'alphabetical') {
            return entries.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
        } else if (this.currentSort === 'mostAlternatives') {
            return entries.sort((a, b) => b[1].length - a[1].length);
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

        const alternativesHtml = alternatives.slice(0, 6).map(app => {
            const starsHtml = app.stars ? `
                <div class="flex items-center text-yellow-500 text-sm">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <span class="font-medium">${this.formatStars(app.stars)}</span>
                </div>
            ` : '';

            const categoriesHtml = app.categories && app.categories.length > 0 ? 
                app.categories.slice(0, 2).map(cat => 
                    `<span class="inline-block bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded mr-1">${cat}</span>`
                ).join('') : '';

            return `
                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="font-semibold text-gray-900 dark:text-white">
                            <a href="${this.basePath}/apps/${app.id}.html"${getLinkAttrs(`${this.basePath}/apps/${app.id}.html`, true)} class="hover:text-primary-600 dark:hover:text-primary-400">
                                ${app.name}
                            </a>
                        </h4>
                        ${starsHtml}
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        ${this.truncateDescription(app.description, 100)}
                    </p>
                    ${categoriesHtml ? `<div class="mb-2">${categoriesHtml}</div>` : ''}
                    <div class="flex items-center justify-between text-xs">
                        ${app.platforms && app.platforms.length > 0 ? `
                            <div class="flex items-center text-gray-500 dark:text-gray-400">
                                <div class="w-2 h-2 rounded-full mr-2" style="background-color: ${this.getPlatformColor(app.platforms[0])};"></div>
                                ${app.platforms[0]}
                            </div>
                        ` : '<div></div>'}
                        <a href="${this.basePath}/apps/${app.id}.html"${getLinkAttrs(`${this.basePath}/apps/${app.id}.html`, true)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                            Details →
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        const moreAlternativesText = alternatives.length > 6 ? 
            `<div class="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                And ${alternatives.length - 6} more alternatives...
            </div>` : '';

        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        ${softwareName}
                        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
                            (${alternatives.length} alternative${alternatives.length !== 1 ? 's' : ''})
                        </span>
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        Self-hosted alternatives to ${softwareName}
                    </p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            'docker': '#384d54'
        };
        
        return colors[platform?.toLowerCase()] || '#6b7280';
    }
}

// Add CSS for line clamp
const style = document.createElement('style');
style.textContent = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlternativesPage();
});
