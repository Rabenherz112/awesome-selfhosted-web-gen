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
        
        // Sort direction tracking
        this.sortDirections = {
            'name': 'asc',      // asc = A-Z, desc = Z-A
            'stars': 'desc',    // desc = highest first, asc = lowest first
            'updated': 'desc'   // desc = newest first, asc = oldest first
        };
        
        // Pagination settings
        this.currentPage = 1;
        this.itemsPerPage = 60;
        this.totalPages = 1;
        this.enablePagination = true;
        this.init();
    }

    async init() {
        // Hide JavaScript required notification since JavaScript is enabled
        const jsNotification = document.getElementById('js-required-notification');
        if (jsNotification) {
            jsNotification.style.display = 'none';
        }
        
        await this.loadSearchData();
        await this.loadLicenseData();
        await this.loadConfig();
        this.extractPlatforms();
        this.extractLicenses();
        this.extractCategories();
        this.parseUrlParameters();
        this.setupEventListeners();
        this.setupPlatformFilters();
        this.setupLicenseFilters();
        this.setupCategoryFilters();
        if (this.enablePagination) {
            this.setupPaginationEventListeners();
        }
        this.updateSortButtons('sortName');
        this.filterSortAndRender();
    }

    async loadConfig() {
        // Helper function to get config value from meta tag with fallback
        const getConfigValue = (metaName, defaultValue, parser = parseInt) => {
            const meta = document.querySelector(`meta[name="${metaName}"]`);
            return meta ? parser(meta.content) || defaultValue : defaultValue;
        };

        try {
            // Load all configuration values using the helper function
            this.itemsPerPage = getConfigValue('items-per-page', 60);
            this.enablePagination = getConfigValue('enable-pagination', false, (val) => val.toLowerCase() === 'true');
            this.browseDescriptionLength = getConfigValue('browse-description-length', 80);
            this.browseDescriptionFull = getConfigValue('browse-description-full', false, (val) => val.toLowerCase() === 'true');
            this.browseMaxCategoriesPerCard = getConfigValue('browse-max-categories-per-card', 2);
            this.browseMaxPlatformsPerCard = getConfigValue('browse-max-platforms-per-card', 3);
        } catch (error) {
            console.log('Using default configuration values');
        }
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

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        
        if (categoryParam) {
            // Create a helper to convert category names to URL-friendly slugs
            const slugify = (text) => {
                return text.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
            };
            
            // Find matching category by comparing slugified versions and direct matches
            let matchingCategory = Array.from(this.categories).find(cat => {
                const slugifiedCat = slugify(cat);
                return slugifiedCat === categoryParam.toLowerCase() || 
                       cat.toLowerCase() === categoryParam.toLowerCase();
            });
            
            if (matchingCategory) {
                this.selectedCategories.add(matchingCategory);
                console.log(`Category filter applied: "${matchingCategory}"`);
            }
        }
    }

    async loadLicenseData() {
        // Load non-free license identifiers from search data
        try {
            const response = await fetch('/static/data/search.json');
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
                
                // Re-setup license filters when toggle changes
                this.setupLicenseFilters();
                
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
                    // If clicking the same sort button, toggle direction
                    if (this.currentSort === sortType) {
                        this.sortDirections[sortType] = this.sortDirections[sortType] === 'asc' ? 'desc' : 'asc';
                    } else {
                        // If clicking a different sort button, set it as current
                        this.currentSort = sortType;
                    }
                    
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

            const filterDiv = document.createElement('label');
            filterDiv.className = 'filter-label cursor-pointer';
            filterDiv.setAttribute('for', `platform-${this.sanitizeId(platform)}`);
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="platform-${this.sanitizeId(platform)}" 
                       class="filter-checkbox" 
                       data-platform="${platform}">
                <span class="flex-1">
                    ${platform}
                    <span class="text-xs opacity-70 ml-1">(${platformCount})</span>
                </span>
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

        // Clear existing filters
        licenseFiltersContainer.innerHTML = '';

        // Filter licenses based on the non-free toggle state
        const allLicenses = Array.from(this.licenses).sort();
        const filteredLicenses = allLicenses.filter(license => {
            // If non-free toggle is OFF, hide non-free licenses
            if (!this.showNonFreeOnly && this.isNonFreeLicense([license])) {
                return false;
            }
            return true;
        });
        
        filteredLicenses.forEach(license => {
            const licenseCount = this.applications.filter(app => 
                app.license && app.license.includes(license)
            ).length;

            const filterDiv = document.createElement('label');
            filterDiv.className = 'filter-label cursor-pointer';
            filterDiv.setAttribute('for', `license-${this.sanitizeId(license)}`);
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="license-${this.sanitizeId(license)}" 
                       class="filter-checkbox" 
                       data-license="${license}">
                <span class="flex-1">
                    ${license}
                    <span class="text-xs opacity-70 ml-1">(${licenseCount})</span>
                </span>
            `;

            const checkbox = filterDiv.querySelector('input');
            
            // Restore selected state if license was previously selected
            if (this.selectedLicenses.has(license)) {
                checkbox.checked = true;
            }
            
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

            const filterDiv = document.createElement('label');
            filterDiv.className = 'filter-label cursor-pointer';
            filterDiv.setAttribute('for', `category-${this.sanitizeId(category)}`);
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="category-${this.sanitizeId(category)}" 
                       class="filter-checkbox" 
                       data-category="${category}">
                <span class="flex-1">
                    ${category}
                    <span class="text-xs opacity-70 ml-1">(${categoryCount})</span>
                </span>
            `;

            const checkbox = filterDiv.querySelector('input');
            // Check if this category was selected from URL parameters
            if (this.selectedCategories.has(category)) {
                checkbox.checked = true;
            }
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
                    if (this.enablePagination) {
                        this.updatePaginationControls();
                    }
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderCurrentPage();
                    if (this.enablePagination) {
                        this.updatePaginationControls();
                    }
                }
            });
        }
    }

    sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    updateSortButtons(activeButtonId) {
        const sortButtons = {
            'sortName': 'name',
            'sortStars': 'stars', 
            'sortUpdated': 'updated'
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
        if (this.enablePagination) {
            this.updatePaginationControls();
        }
    }

    sortApplications() {
        this.filteredApplications.sort((a, b) => {
            const sortType = this.currentSort;
            const direction = this.sortDirections[sortType];
            let comparison = 0;

            switch (sortType) {
                case 'stars':
                    const starsA = a.stars || 0;
                    const starsB = b.stars || 0;
                    comparison = direction === 'asc' ? starsA - starsB : starsB - starsA;
                    break;
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
                    comparison = direction === 'asc' ? 
                        dateA.getTime() - dateB.getTime() : 
                        dateB.getTime() - dateA.getTime();
                    break;
                case 'name':
                default:
                    comparison = direction === 'asc' ? 
                        a.name.localeCompare(b.name) : 
                        b.name.localeCompare(a.name);
                    break;
            }
            
            return comparison;
        });
    }

    renderCurrentPage() {
        const gridContainer = document.getElementById('applicationsGrid');
        if (!gridContainer) return;

        // Clear existing content
        gridContainer.innerHTML = '';

        // Calculate start and end indices for current page (or show all if pagination disabled)
        let pageApplications;
        if (this.enablePagination) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredApplications.length);
            pageApplications = this.filteredApplications.slice(startIndex, endIndex);
        } else {
            pageApplications = this.filteredApplications; // Show all applications
        }

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

        const openExternalInNewTab = document.querySelector('meta[name="open-external-new-tab"]')?.content === 'true' || false;
        const openInternalInNewTab = document.querySelector('meta[name="open-internal-new-tab"]')?.content === 'true' || false;

        // Helper function to get target attributes
        const getLinkAttrs = (url, isInternal = null) => {
            if (isInternal === null) {
                isInternal = url.startsWith('/') || url.startsWith(window.location.origin);
            }

            if (isInternal && openInternalInNewTab) {
                return ' target="_blank" rel="noopener"';
            } else if (!isInternal && openExternalInNewTab) {
                return ' target="_blank" rel="noopener noreferrer"';
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
        const categoriesHtml = app.categories ? app.categories.slice(0, this.browseMaxCategoriesPerCard).map(category => 
            `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full mr-1 mb-1">${category}</span>`
        ).join('') + (app.categories.length > this.browseMaxCategoriesPerCard ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1">+${app.categories.length - this.browseMaxCategoriesPerCard}</span>` : '') : '';
        
        // Platform badges (show up to configured limit)
        const platformsHtml = app.platforms && app.platforms.length > 0 ? app.platforms.slice(0, this.browseMaxPlatformsPerCard).map(platform => {
            const color = this.getPlatformColor(platform);
            return `<span class="inline-flex items-center text-gray-500 dark:text-gray-400 text-xs mr-2 mb-1">
                <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${color};"></div>
                ${platform}
            </span>`;
        }).join('') + (app.platforms.length > this.browseMaxPlatformsPerCard ? `<span class="inline-block bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-1 rounded mr-1 mb-1">+${app.platforms.length - this.browseMaxPlatformsPerCard}</span>` : '') : '';

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
        <a href="/apps/${app.id}.html"${getLinkAttrs(`/apps/${app.id}.html`, true)} class="text-primary-600 hover:text-primary-700 dark:text-primary-400        dark:hover:text-primary-300 font-medium">
            Details
        </a>
        `;

        card.innerHTML = `
            <div class="p-4 flex flex-col flex-grow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                <a href="/apps/${app.id}.html" class="hover:text-primary-600 dark:hover:text-primary-400">
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
                
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 flex-grow">
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

    truncateDescription(description, maxLength = null) {
        if (!description) return '';
        
        if (maxLength === null) {
            maxLength = this.browseDescriptionLength;
        }
        if (this.browseDescriptionFull || description.length <= maxLength) {
            return description;
        }
        
        const truncated = description.substring(0, maxLength).trim();
        const lastSpace = truncated.lastIndexOf(' ');
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
        
        return finalText + '...';
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