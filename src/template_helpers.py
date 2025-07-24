"""
Template helper functions for Jinja2 templates.
"""

import re
from datetime import datetime
from typing import List, Any
from .config import Config


class TemplateHelpers:
    """Helper functions for Jinja2 templates."""
    
    def __init__(self, config: Config, licenses_data: dict = None):
        """Initialize template helpers with configuration and license data."""
        self.config = config
        self.licenses_data = licenses_data or {}
    
    def slugify(self, text: str) -> str:
        """Convert text to URL-friendly slug."""
        if not text:
            return ""
        
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', text.lower().strip())
        return slug.strip('-')
    
    def format_stars(self, stars: int) -> str:
        """Format star count for display."""
        if stars is None or stars == 0:
            return ""
        
        if stars >= 1000:
            return f"{stars / 1000:.1f}k"
        return str(stars)
    
    def format_date(self, date_str: str) -> str:
        """Format date string for display."""
        if not date_str:
            return ""
        
        try:
            # Handle different date formats
            if 'T' in date_str:
                # ISO datetime format (2023-12-01T10:30:00Z)
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            else:
                # Simple date format (2025-07-21)
                dt = datetime.strptime(date_str, '%Y-%m-%d')
            
            return dt.strftime('%B %d, %Y')
        except (ValueError, AttributeError) as e:
            print(f"Warning: Could not parse date '{date_str}': {e}")
            return date_str
    
    def truncate_description(self, description: str, length: int = 150) -> str:
        """Truncate description to specified length."""
        if not description:
            return ""
        
        if len(description) <= length:
            return description
        
        # Find the last space before the limit
        truncated = description[:length]
        last_space = truncated.rfind(' ')
        
        if last_space > 0:
            truncated = truncated[:last_space]
        
        return truncated + "..."
    
    def get_app_url(self, app_id: str) -> str:
        """Get URL for application detail page."""
        return f"/apps/{app_id}.html"
    
    def format_license(self, license_name: str) -> str:
        """Format single license name for display using loaded license data."""
        if not license_name:
            return "Unknown"
        
        # First try exact match
        if license_name in self.licenses_data:
            return self.licenses_data[license_name]['name']
        
        # Try case-insensitive match
        for license_id, license_info in self.licenses_data.items():
            if license_id.lower() == license_name.lower():
                return license_info['name']
        
        # Return original name if no match found
        return license_name
    
    def format_licenses(self, licenses) -> str:
        """Format multiple licenses for display."""
        if not licenses:
            return "Unknown"
        
        # Handle both list and string cases
        if isinstance(licenses, str):
            return self.format_license(licenses)
        
        if isinstance(licenses, list):
            if len(licenses) == 1:
                return self.format_license(licenses[0])
            formatted_licenses = [self.format_license(license) for license in licenses]
            return " / ".join(formatted_licenses)
        
        return str(licenses)
    
    def format_platforms(self, platforms) -> str:
        """Format multiple platforms for display."""
        if not platforms:
            return ""
        
        # Handle both list and string cases
        if isinstance(platforms, str):
            return platforms
        
        if isinstance(platforms, list):
            if len(platforms) == 1:
                return platforms[0]
            return " / ".join(platforms)
        
        return str(platforms)
    
    def get_platforms_badges_html(self, platforms) -> str:
        """Generate HTML badges for platforms."""
        if not platforms:
            return ""
        
        # Handle both list and string cases
        if isinstance(platforms, str):
            platforms = [platforms]
        elif not isinstance(platforms, list):
            return ""
        
        html_parts = []
        for platform in platforms:
            if platform:
                html_parts.append(
                    f'<span class="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded">{platform}</span>'
                )
        
        return " ".join(html_parts)
    
    def get_tags_badges_html(self, tags) -> str:
        """Generate HTML badges for tags."""
        if not tags:
            return ""
        
        # Handle both list and string cases  
        if isinstance(tags, str):
            tags = [tags]
        elif not isinstance(tags, list):
            return ""
        
        html_parts = []
        for tag in tags:
            if tag:
                html_parts.append(
                    f'<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3 py-1 rounded-full">{tag}</span>'
                )
        
        return " ".join(html_parts)
    
    def sort_by_stars(self, apps: List[Any], reverse: bool = True) -> List[Any]:
        """Sort applications by star count."""
        return sorted(apps, key=lambda x: x.stars or 0, reverse=reverse)
    
    def get_language_color(self, language: str) -> str:
        """Get color code for programming language."""
        if not language:
            return "#586069"
        
        # GitHub language colors
        colors = {
            'javascript': '#f1e05a',
            'python': '#3572a5',
            'java': '#b07219',
            'typescript': '#2b7489',
            'c#': '#239120',
            'php': '#4f5d95',
            'c++': '#f34b7d',
            'c': '#555555',
            'shell': '#89e051',
            'go': '#00add8',
            'rust': '#dea584',
            'ruby': '#701516',
            'swift': '#ffac45',
            'kotlin': '#f18e33',
            'dart': '#00b4ab',
            'html': '#e34c26',
            'css': '#563d7c',
            'vue': '#2c3e50',
            'dockerfile': '#384d54',
        }
        
        return colors.get(language.lower(), '#586069')
    
    def format_github_url(self, repo_url: str) -> str:
        """Format GitHub repository URL."""
        if not repo_url or 'github.com' not in repo_url:
            return repo_url
        
        # Ensure it's a proper GitHub URL
        if not repo_url.startswith('http'):
            repo_url = 'https://' + repo_url
        
        return repo_url
    
    def get_app_tags_html(self, app: Any, max_tags: int = 5) -> str:
        """Generate HTML for application tags."""
        if not app.tags:
            return ""
        
        html_parts = []
        tags_to_show = app.tags[:max_tags]
        
        for tag in tags_to_show:
            html_parts.append(
                f'<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">{tag}</span>'
            )
        
        if len(app.tags) > max_tags:
            remaining = len(app.tags) - max_tags
            html_parts.append(
                f'<span class="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mr-1 mb-1">+{remaining} more</span>'
            )
        
        return ''.join(html_parts)
    
    def get_category_badge_html(self, category: str) -> str:
        """Generate HTML for category badge."""
        if not category:
            return ""
        
        return f'<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{category}</span>'
    
    def format_app_stats(self, app: Any) -> str:
        """Format application statistics for display."""
        stats = []
        
        if app.stars:
            stars_formatted = self.format_stars(app.stars)
            stats.append(f"⭐ {stars_formatted}")
        
        if app.forks:
            stats.append(f"🍴 {app.forks}")
        
        if app.language:
            stats.append(f"💻 {app.language}")
        
        return " • ".join(stats) if stats else ""
    
    def is_recently_updated(self, last_updated: str, days: int = 30) -> bool:
        """Check if application was updated recently."""
        if not last_updated:
            return False
        
        try:
            dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
            now = datetime.now(dt.tzinfo)
            return (now - dt).days <= days
        except (ValueError, AttributeError):
            return False
    
    def get_demo_url_display(self, demo_url: str) -> str:
        """Get display text for demo URL."""
        if not demo_url:
            return ""
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(demo_url)
            return parsed.netloc or demo_url
        except:
            return demo_url
    
    def generate_breadcrumbs(self, page_type: str, **kwargs) -> List[dict]:
        """Generate breadcrumb navigation."""
        breadcrumbs = [{'name': 'Home', 'url': '/'}]
        
        if page_type == 'browse':
            breadcrumbs.append({'name': 'Browse', 'url': '/browse.html'})
        
        elif page_type == 'category':
            category = kwargs.get('category')
            breadcrumbs.append({'name': 'Categories', 'url': '/browse.html'})
            if category:
                breadcrumbs.append({
                    'name': category['name'], 
                    'url': '#'  # No dedicated category pages anymore
                })
        
        elif page_type == 'app':
            app = kwargs.get('app')
            breadcrumbs.append({'name': 'Apps', 'url': '/'})
            if app:
                breadcrumbs.append({
                    'name': app.name, 
                    'url': self.get_app_url(app.id)
                })
        
        return breadcrumbs 