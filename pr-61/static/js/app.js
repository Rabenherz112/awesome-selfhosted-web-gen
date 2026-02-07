// Main application JavaScript
(function() {
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeMobileMenu();
        initializeScrollToTop();
        initializeBanner();
    });
    
    // Mobile menu functionality
    function initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', function(event) {
                if (!mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    }
    
    // Scroll to top functionality
    function initializeScrollToTop() {
        // Create scroll to top button
        const scrollButton = document.createElement('button');
        scrollButton.innerHTML = '↑';
        scrollButton.className = 'fixed bottom-6 right-6 bg-primary text-surface p-3 rounded-full shadow-lg hover:bg-primary transition-all duration-300 transform translate-y-16 opacity-0 z-50';
        scrollButton.setAttribute('aria-label', 'Scroll to top');
        document.body.appendChild(scrollButton);
        
        // Show/hide based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollButton.classList.remove('translate-y-16', 'opacity-0');
            } else {
                scrollButton.classList.add('translate-y-16', 'opacity-0');
            }
        });
        
        // Scroll to top when clicked
        scrollButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Utility function to show/hide loading states
    window.setLoading = function(element, loading) {
        if (loading) {
            element.classList.add('loading');
        } else {
            element.classList.remove('loading');
        }
    };
    
    // Utility function for smooth scrolling to elements
    window.scrollToElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };
    
    // Add keyboard navigation support
    document.addEventListener('keydown', function(event) {
        // Escape key closes modals and search results
        if (event.key === 'Escape') {
            // Close search results
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.classList.add('hidden');
            }
            
            // Close mobile menu
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        }
    });
    
    // Add focus management for better accessibility
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', function(event) {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
        });
    }
    
    // Performance optimization: Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Add smooth hover effects
    const cards = document.querySelectorAll('.hover\\:shadow-lg');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Banner functionality
    function initializeBanner() {
        const banner = document.getElementById('site-banner');
        const dismissButton = document.getElementById('dismiss-banner');
        
        if (!banner) return;
        
        try {
            // Create a hash of the banner content to detect changes
            const bannerText = banner.querySelector('p')?.textContent?.trim() || '';
            const bannerButton = banner.querySelector('a')?.textContent?.trim() || '';
            const bannerContent = bannerText + bannerButton;
            
            // Simple hash function that's more reliable than btoa
            let bannerHash = 0;
            for (let i = 0; i < bannerContent.length; i++) {
                const char = bannerContent.charCodeAt(i);
                bannerHash = ((bannerHash << 5) - bannerHash) + char;
                bannerHash = bannerHash & bannerHash; // Convert to 32-bit integer
            }
            bannerHash = Math.abs(bannerHash).toString(16);
            
            // Check if this specific banner was previously dismissed
            const dismissedBanners = JSON.parse(localStorage.getItem('dismissed-banners') || '[]');
            if (dismissedBanners.includes(bannerHash)) {
                banner.style.display = 'none';
                return;
            }
            
            // Handle dismiss button
            if (dismissButton) {
                dismissButton.addEventListener('click', function() {
                    banner.style.display = 'none';
                    
                    try {
                        // Add this banner's hash to the dismissed list
                        const currentDismissed = JSON.parse(localStorage.getItem('dismissed-banners') || '[]');
                        if (!currentDismissed.includes(bannerHash)) {
                            currentDismissed.push(bannerHash);
                            // Keep only the last 3 dismissed banners to avoid localStorage bloat
                            const recentDismissed = currentDismissed.slice(-3);
                            localStorage.setItem('dismissed-banners', JSON.stringify(recentDismissed));
                        }
                    } catch (e) {
                        console.log('Could not save banner dismiss state:', e);
                    }
                });
            }
        } catch (error) {
            console.log('Banner initialization error:', error);
            
            // Fallback: simple dismiss without content tracking
            if (dismissButton) {
                dismissButton.addEventListener('click', function() {
                    banner.style.display = 'none';
                });
            }
        }
    }

    console.log('✅ ASWG initialized');
})(); 