// Browse page functionality
class BrowsePage {
    constructor() {
        this.applications = [];
        this.filteredApplications = [];
        this.platforms = new Set();
        this.selectedPlatforms = new Set();
        this.licenses = new Set();
        this.selectedLicenses = new Set();
        this.categories = new Set();
        this.selectedCategories = new Set();
        this.nonFreeLicenses = new Set();
        this.showNonFreeOnly = false;
        this.currentSort = 'name';
        
        // Pagination settings
        this.currentPage = 1;
        this.itemsPerPage = 60;
        this.totalPages = 1;
        
        this.init();
    }

    async init() {
        await this.loadSearchData();
        await this.loadLicenseData();
        this.extractPlatforms();
        this.extractLicenses();
        this.extractCategories();
        this.setupEventListeners();
        this.setupPlatformFilters();
        this.setupLicenseFilters();
        this.setupCategoryFilters();
        this.setupPaginationEventListeners();
        this.filterSortAndRender();
    }

    async loadSearchData() {
        try {
            const response = await fetch('/static/data/search.json');
            const data = await response.json();
            this.applications = data.apps || [];
            this.filteredApplications = [...this.applications];
        } catch (error) {
            console.error('Failed to load search data:', error);
        }
    }

    async loadLicenseData() {
        // Non-free license identifiers from licenses-nonfree.yml
        const nonFreeLicenseIds = [
            'BSD-3-Clause-No-Military-License',
            'BUSL-1.1',
            'CC-BY-NC-SA-3.0', 
            'CC-BY-NC-SA-4.0',
            'CC-BY-ND-3.0',
            'CC-BY-NC-4.0',
            'Commons-Clause',
            'DPL',
            'Elastic-2.0',
            'NPOSL-3.0',
            'SSPL-1.0',
            '⊘ Proprietary'
        ];
        
        nonFreeLicenseIds.forEach(license => {
            this.nonFreeLicenses.add(license);
        });
    }

    extractPlatforms() {
        this.applications.forEach(app => {
            if (app.platforms) {
                app.platforms.forEach(platform => {
                    if (platform && platform.trim()) {
                        this.platforms.add(platform.trim());
                    }
                });
            }
        });
    }

    extractLicenses() {
        this.applications.forEach(app => {
            if (app.license) {
                app.license.forEach(license => {
                    if (license && license.trim()) {
                        this.licenses.add(license.trim());
                    }
                });
            }
        });
    }

    extractCategories() {
        this.applications.forEach(app => {
            if (app.categories) {
                app.categories.forEach(category => {
                    if (category && category.trim()) {
                        this.categories.add(category.trim());
                    }
                });
            }
        });
    }

    setupEventListeners() {
        // Show non-free toggle
        const showNonFreeToggle = document.getElementById('showNonFree');
        if (showNonFreeToggle) {
            showNonFreeToggle.addEventListener('change', (e) => {
                this.showNonFreeOnly = e.target.checked;
                this.currentPage = 1; // Reset to first page
                this.filterSortAndRender();
            });
        }

        // Sort buttons
        const sortButtons = {
            'sortName': 'name',
            'sortStars': 'stars',
            'sortUpdated': 'updated'
        };

        Object.entries(sortButtons).forEach(([buttonId, sortType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.currentSort = sortType;
                    this.updateSortButtons(buttonId);
                    this.currentPage = 1; // Reset to first page
                    this.filterSortAndRender();
                });
            }
        });
    }

    setupPlatformFilters() {
        const platformFiltersContainer = document.getElementById('platformFilters');
        if (!platformFiltersContainer) return;

        const sortedPlatforms = Array.from(this.platforms).sort();
        
        sortedPlatforms.forEach(platform => {
            const platformCount = this.applications.filter(app => 
                app.platforms && app.platforms.includes(platform)
            ).length;

            const filterDiv = document.createElement('div');
            filterDiv.className = 'flex items-center space-x-2';
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="platform-${this.sanitizeId(platform)}" 
                       class="rounded text-primary-600 focus:ring-primary-500" 
                       data-platform="${platform}">
                <label for="platform-${this.sanitizeId(platform)}" 
                       class="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    ${platform}
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(${platformCount})</span>
                </label>
            `;

            const checkbox = filterDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedPlatforms.add(platform);
                } else {
                    this.selectedPlatforms.delete(platform);
                }
                this.currentPage = 1; // Reset to first page
                this.filterSortAndRender();
            });

            platformFiltersContainer.appendChild(filterDiv);
        });
    }

    setupLicenseFilters() {
        const licenseFiltersContainer = document.getElementById('licenseFilters');
        if (!licenseFiltersContainer) return;

        const sortedLicenses = Array.from(this.licenses).sort();
        
        sortedLicenses.forEach(license => {
            const licenseCount = this.applications.filter(app => 
                app.license && app.license.includes(license)
            ).length;

            const filterDiv = document.createElement('div');
            filterDiv.className = 'flex items-center space-x-2';
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="license-${this.sanitizeId(license)}" 
                       class="rounded text-primary-600 focus:ring-primary-500" 
                       data-license="${license}">
                <label for="license-${this.sanitizeId(license)}" 
                       class="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    ${license}
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(${licenseCount})</span>
                </label>
            `;

            const checkbox = filterDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedLicenses.add(license);
                } else {
                    this.selectedLicenses.delete(license);
                }
                this.currentPage = 1; // Reset to first page
                this.filterSortAndRender();
            });

            licenseFiltersContainer.appendChild(filterDiv);
        });
    }

    setupCategoryFilters() {
        const categoryFiltersContainer = document.getElementById('categoryFilters');
        if (!categoryFiltersContainer) return;

        const sortedCategories = Array.from(this.categories).sort();
        
        sortedCategories.forEach(category => {
            const categoryCount = this.applications.filter(app => 
                app.categories && app.categories.includes(category)
            ).length;

            const filterDiv = document.createElement('div');
            filterDiv.className = 'flex items-center space-x-2';
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="category-${this.sanitizeId(category)}" 
                       class="rounded text-primary-600 focus:ring-primary-500" 
                       data-category="${category}">
                <label for="category-${this.sanitizeId(category)}" 
                       class="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    ${category}
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(${categoryCount})</span>
                </label>
            `;

            const checkbox = filterDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedCategories.add(category);
                } else {
                    this.selectedCategories.delete(category);
                }
                this.currentPage = 1; // Reset to first page
                this.filterSortAndRender();
            });

            categoryFiltersContainer.appendChild(filterDiv);
        });
    }

    setupPaginationEventListeners() {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderCurrentPage();
                    this.updatePaginationControls();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderCurrentPage();
                    this.updatePaginationControls();
                }
            });
        }
    }

    sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    updateSortButtons(activeButtonId) {
        const sortButtons = ['sortName', 'sortStars', 'sortUpdated'];
        
        sortButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                if (buttonId === activeButtonId) {
                    button.className = 'px-3 py-1 text-sm bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded';
                } else {
                    button.className = 'px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded';
                }
            }
        });
    }

    isNonFreeLicense(licenses) {
        if (!licenses || licenses.length === 0) return false;
        
        // A license is non-free if it IS in the non-free licenses set
        return licenses.some(license => 
            this.nonFreeLicenses.has(license)
        );
    }

    filterSortAndRender() {
        // Filter applications
        this.filteredApplications = this.applications.filter(app => {
            // Platform filter
            if (this.selectedPlatforms.size > 0) {
                const hasSelectedPlatform = app.platforms && 
                    app.platforms.some(platform => this.selectedPlatforms.has(platform));
                if (!hasSelectedPlatform) return false;
            }

            // License filter
            if (this.selectedLicenses.size > 0) {
                const hasSelectedLicense = app.license && 
                    app.license.some(license => this.selectedLicenses.has(license));
                if (!hasSelectedLicense) return false;
            }

            // Category filter
            if (this.selectedCategories.size > 0) {
                const hasSelectedCategory = app.categories && 
                    app.categories.some(category => this.selectedCategories.has(category));
                if (!hasSelectedCategory) return false;
            }

            // Non-free license filter
            if (this.showNonFreeOnly) {
                // When toggle is ON: show ALL software (free + non-free)
                // No filtering needed - show everything
            } else {
                // When toggle is OFF: hide non-free software (show only free software)
                if (this.isNonFreeLicense(app.license)) return false;
            }

            return true;
        });

        // Sort applications
        this.sortApplications();
        
        // Calculate pagination
        this.totalPages = Math.ceil(this.filteredApplications.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }
        
        // Render current page
        this.renderCurrentPage();
        this.updateCounts();
        this.updatePaginationControls();
    }

    sortApplications() {
        this.filteredApplications.sort((a, b) => {
            switch (this.currentSort) {
                case 'stars':
                    return (b.stars || 0) - (a.stars || 0);
                case 'updated':
                    // Handle different date formats
                    const parseDate = (dateStr) => {
                        if (!dateStr) return new Date(0);
                        // Handle YYYY-MM-DD format
                        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            return new Date(dateStr + 'T00:00:00Z');
                        }
                        // Handle ISO format
                        return new Date(dateStr);
                    };
                    
                    const dateA = parseDate(a.last_updated);
                    const dateB = parseDate(b.last_updated);
                    return dateB.getTime() - dateA.getTime();
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    renderCurrentPage() {
        const gridContainer = document.getElementById('applicationsGrid');
        if (!gridContainer) return;

        // Clear existing content
        gridContainer.innerHTML = '';

        // Calculate start and end indices for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredApplications.length);
        const pageApplications = this.filteredApplications.slice(startIndex, endIndex);

        // Render applications for current page
        pageApplications.forEach(app => {
            const appCard = this.createApplicationCard(app);
            gridContainer.appendChild(appCard);
        });

        // Show loading message if no applications
        if (pageApplications.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-500 dark:text-gray-400">
                        ${this.filteredApplications.length === 0 ? 'No applications match your filters.' : 'Loading...'}
                    </div>
                </div>
            `;
        }
    }

    createApplicationCard(app) {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden h-full flex flex-col';
        
        const dependsIcon = app.depends_3rdparty ? `
            <div class="flex-shrink-0" title="Depends on third-party services">
                <svg class="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
            </div>
        ` : '';
        
        const starsIcon = app.stars ? `
            <div class="flex items-center text-yellow-500 flex-shrink-0">
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

        const releaseIcon = app.current_release ? `
            <div class="flex items-center text-blue-500 flex-shrink-0" title="Latest release: ${app.current_release.tag}${app.current_release.published_at ? ' • Released on ' + this.formatReleaseDate(app.current_release.published_at) : ''}">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd"/>
                </svg>
                <span class="text-xs font-medium">${app.current_release.tag}</span>
            </div>
        ` : '';
        
        const tagsHtml = app.tags ? app.tags.slice(0, 2).map(tag => 
            `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full mr-1 mb-1">${tag}</span>`
        ).join('') + (app.tags.length > 2 ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1">+${app.tags.length - 2}</span>` : '') : '';
        
        // Platform badges (show up to 3 platforms)
        const platformsHtml = app.platforms && app.platforms.length > 0 ? app.platforms.slice(0, 3).map(platform => 
            `<span class="inline-block bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-1 rounded-full mr-1 mb-1">${platform}</span>`
        ).join('') + (app.platforms.length > 3 ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1">+${app.platforms.length - 3}</span>` : '') : '';
        
        // Only show buttons when they have valid URLs
        const demoLink = (app.demo_url && app.demo_url.trim()) ? `
            <a href="${app.demo_url}" target="_blank" rel="noopener" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                Demo
            </a>
        ` : '';

        const sourceLink = (app.repo_url && app.repo_url.trim()) ? `
            <a href="${app.repo_url}" target="_blank" rel="noopener" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                Source
            </a>
        ` : '';

        // Only show website link if it exists and is different from the source code URL
        const websiteLink = (app.url && app.url.trim() && app.url !== app.repo_url) ? `
            <a href="${app.url}" target="_blank" rel="noopener" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                Website
            </a>
        ` : '';
        
        card.innerHTML = `
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            <a href="/apps/${app.id}.html" class="hover:text-primary-600 dark:hover:text-primary-400">
                                ${app.name}
                            </a>
                        </h3>
                    </div>
                    <div class="flex items-center space-x-2 ml-2">
                        ${dependsIcon}
                        ${starsIcon}
                        ${clockIcon}
                        ${releaseIcon}
                    </div>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 flex-grow">
                    ${this.truncateDescription(app.description, 80)}
                </p>
                
                ${tagsHtml ? `<div class="mb-3">${tagsHtml}</div>` : ''}
                ${platformsHtml ? `<div class="mb-3">${platformsHtml}</div>` : ''}
                
                <div class="flex items-end justify-between text-xs mt-auto pt-2">
                    <div class="flex flex-wrap gap-2">
                        ${websiteLink}
                        ${sourceLink}
                        ${demoLink}
                        <a href="/apps/${app.id}.html" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                            Details
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        return card;
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

    formatReleaseDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return dateStr;
        }
    }

    truncateDescription(description, maxLength) {
        if (!description) return '';
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength).trim() + '...';
    }

    updateCounts() {
        const visibleCountElement = document.getElementById('visibleCount');
        const totalCountElement = document.getElementById('totalCount');
        
        if (visibleCountElement) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endIndex = Math.min(startIndex + this.itemsPerPage - 1, this.filteredApplications.length);
            const displayText = this.filteredApplications.length > 0 ? `${startIndex}-${endIndex}` : '0';
            visibleCountElement.textContent = displayText;
        }
        
        if (totalCountElement) {
            totalCountElement.textContent = this.filteredApplications.length;
        }
    }

    updatePaginationControls() {
        const paginationContainer = document.getElementById('paginationContainer');
        const currentPageElement = document.getElementById('currentPage');
        const totalPagesElement = document.getElementById('totalPages');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (this.totalPages > 1) {
            paginationContainer.classList.remove('hidden');
            
            if (currentPageElement) currentPageElement.textContent = this.currentPage;
            if (totalPagesElement) totalPagesElement.textContent = this.totalPages;
            
            if (prevButton) {
                prevButton.disabled = this.currentPage <= 1;
            }
            
            if (nextButton) {
                nextButton.disabled = this.currentPage >= this.totalPages;
            }
        } else {
            paginationContainer.classList.add('hidden');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BrowsePage();
}); 