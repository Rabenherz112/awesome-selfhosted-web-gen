"""
Site generation module using Jinja2 templates.
"""

import json
import shutil
from pathlib import Path
from typing import Dict, List, Any
from math import ceil
from jinja2 import Environment, FileSystemLoader, select_autoescape

from .config import Config
from .data_processor import Application
from .template_helpers import TemplateHelpers


class SiteGenerator:
    """Static site generator using Jinja2 templates."""
    
    def __init__(self, config: Config):
        """Initialize site generator with configuration."""
        self.config = config
        self.template_helpers = TemplateHelpers(config)
        
        # Set up Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(config.template_dir)),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Register template helpers
        self._register_template_functions()
    
    def _register_template_functions(self):
        """Register custom template functions and filters."""
        # Global functions
        self.jinja_env.globals.update({
            'site_config': self.config.get_site_config(),
            'ui_config': self.config.get('ui', {}),
            'generation_config': self.config.get_generation_config(),
            'format_stars': self.template_helpers.format_stars,
            'format_date': self.template_helpers.format_date,
            'format_license': self.template_helpers.format_license,
            'format_licenses': self.template_helpers.format_licenses,
            'format_platforms': self.template_helpers.format_platforms,
            'get_platforms_badges_html': self.template_helpers.get_platforms_badges_html,
            'get_tags_badges_html': self.template_helpers.get_tags_badges_html,
            'truncate_description': self.template_helpers.truncate_description,
            'get_app_url': self.template_helpers.get_app_url,
            'get_language_color': self.template_helpers.get_language_color,
            'render_template_string': self.template_helpers.render_template_string,
        })
        
        # Custom filters
        self.jinja_env.filters.update({
            'slugify': self.template_helpers.slugify,
            'sort_by_stars': self.template_helpers.sort_by_stars,
        })
    
    def generate_site(self, applications: List[Application], categories: Dict, statistics: Dict, licenses: Dict = None):
        """Generate the complete static site."""
        print("Starting site generation...")
        
        # Update template helpers with license data
        if licenses:
            self.licenses_data = licenses  # Store for use in related apps algorithm
            self.template_helpers = TemplateHelpers(self.config, licenses)
            self._register_template_functions()
        
        # Ensure output directories exist
        self.config.ensure_directories()
        
        # Copy static assets
        self._copy_static_assets()
        
        # Generate search data
        search_data = self._generate_search_data(applications)
        
        # Generate pages
        self._generate_browse_as_homepage(applications, categories)  # Browse becomes homepage
        self._generate_statistics_page(applications, categories, statistics)  # New statistics page
        self._generate_app_detail_pages(applications)
        self._generate_search_data_file(search_data)
        
        # Generate additional files
        self._generate_sitemap(applications, categories)
        
        print(f"Site generation complete! Output in: {self.config.output_dir}")
    
    def _copy_static_assets(self):
        """Copy static assets to output directory."""
        if self.config.static_dir.exists():
            output_static = self.config.output_dir / 'static'
            
            # Remove existing static directory
            if output_static.exists():
                shutil.rmtree(output_static)
            
            # Copy static files
            shutil.copytree(self.config.static_dir, output_static)
            print("Static assets copied")
    
    def _generate_homepage(self, applications: List[Application], categories: Dict, statistics: Dict):
        """Generate the homepage."""
        template = self.jinja_env.get_template('pages/index.html')
        
        # Get featured applications (top starred)
        featured_apps = sorted(
            [app for app in applications if app.stars],
            key=lambda x: x.stars or 0,
            reverse=True
        )[:12]
        
        # Get recent updates
        recent_apps = sorted(
            [app for app in applications if app.last_updated],
            key=lambda x: x.last_updated or '',
            reverse=True
        )[:8]
        
        # Get category stats
        category_stats = [
            {
                'id': cat_id,
                'name': cat_info['name'],
                'count': cat_info['count'],
                'url': self.template_helpers.get_category_url(cat_id)
            }
            for cat_id, cat_info in categories.items()
            if cat_info['count'] > 0
        ]
        category_stats.sort(key=lambda x: x['count'], reverse=True)
        
        content = template.render(
            featured_apps=featured_apps,
            recent_apps=recent_apps,
            categories=category_stats[:12],
            statistics=statistics,
            total_apps=len(applications),
            page_title="Discover Self-Hosted Applications"
        )
        
        output_path = self.config.output_dir / 'index.html'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("Homepage generated")
    
    def _generate_browse_as_homepage(self, applications: List[Application], categories: Dict):
        """Generate the browse page as homepage (index.html) with client-side pagination."""
        template = self.jinja_env.get_template('pages/browse.html')
        
        # Sort applications by name by default for initial display
        sorted_apps = sorted(applications, key=lambda x: x.name.lower())
        
        # Generate single page with empty applications (JavaScript will populate)
        content = template.render(
            applications=[],  # Empty - JavaScript will handle all rendering
            categories=categories,
            total_applications=len(applications),
            items_per_page=self.config.get('generation.items_per_page', 24),
            page_title="Browse Applications"
        )
        
        # Save single homepage
        output_path = self.config.output_dir / 'index.html'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Browse page generated (client-side rendering for {len(applications)} apps)")
    
    def _generate_statistics_page(self, applications: List[Application], categories: Dict, statistics: Dict):
        """Generate the statistics page."""
        template = self.jinja_env.get_template('pages/statistics.html')
        
        content = template.render(
            applications=applications,
            categories=categories,
            statistics=statistics,
            page_title="Statistics"
        )
        
        output_path = self.config.output_dir / 'statistics.html'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("Statistics page generated")
    
    def _generate_app_detail_pages(self, applications: List[Application]):
        """Generate individual application detail pages."""
        template = self.jinja_env.get_template('pages/app_detail.html')
        
        # Create apps directory
        apps_dir = self.config.output_dir / 'apps'
        apps_dir.mkdir(exist_ok=True)
        
        for app in applications:
            # Find related applications
            related_apps = self._find_related_apps(app, applications)
            
            content = template.render(
                app=app,
                related_apps=related_apps[:6],  # Limit to 6 related apps
                page_title=f"{app.name} - Self-Hosted Application"
            )
            
            output_path = apps_dir / f"{app.id}.html"
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        print(f"Application detail pages generated ({len(applications)} apps)")
    
    def _find_related_apps(self, target_app: Application, all_applications: List[Application]) -> List[Application]:
        """Find applications related to the target app with improved algorithm."""
        related = []
        
        for app in all_applications:
            if app.id == target_app.id:
                continue
            
            score = 0
            
            # 1. Same categories = +4 points each (primary matching criteria)
            common_categories = set(app.categories or []) & set(target_app.categories or [])
            score += len(common_categories) * 4
            
            # 2. Same programming language = +3 points (strong technical similarity)  
            if app.language and target_app.language and app.language.lower() == target_app.language.lower():
                score += 3
            
            # 3. Similar platform support = +2 points per common platform
            common_platforms = set(app.platforms or []) & set(target_app.platforms or [])
            score += len(common_platforms) * 2
            
            # 4. Same license type (free vs non-free) = +2 points
            if app.license and target_app.license:
                target_is_nonfree = self._is_app_nonfree(target_app)
                app_is_nonfree = self._is_app_nonfree(app)
                if target_is_nonfree == app_is_nonfree:
                    score += 2
            
            # 5. Similar popularity tier = +1 point (apps with similar star counts)
            if app.stars and target_app.stars:
                target_tier = self._get_popularity_tier(target_app.stars)
                app_tier = self._get_popularity_tier(app.stars)
                if target_tier == app_tier:
                    score += 1
            
            # 6. Both have or don't have 3rd party dependencies = +1 point
            if app.depends_3rdparty == target_app.depends_3rdparty:
                score += 1
            
            if score > 0:
                related.append((app, score))
        
        # Sort by score (descending), then by stars (descending), then by name
        related.sort(key=lambda x: (-x[1], -(x[0].stars or 0), x[0].name.lower()))
        
        return [app for app, score in related]
    
    def _is_app_nonfree(self, app: Application) -> bool:
        """Check if an application uses non-free licenses."""
        if not app.license:
            return False
        
        # Get non-free license identifiers from loaded license data
        if hasattr(self, 'licenses_data') and self.licenses_data:
            nonfree_licenses = {lic_id for lic_id, lic_info in self.licenses_data.items() 
                               if not lic_info.get('free', True)}
            return any(lic in nonfree_licenses for lic in app.license)
        
        # Fallback to basic check if license data not available
        return any(lic in ['⊘ Proprietary'] for lic in app.license)
    
    def _get_popularity_tier(self, stars: int) -> str:
        """Categorize applications by popularity tier based on star count."""
        if stars >= 10000:
            return 'mega'      # 10k+ stars
        elif stars >= 5000:
            return 'highly'    # 5k-10k stars  
        elif stars >= 1000:
            return 'popular'   # 1k-5k stars
        elif stars >= 100:
            return 'moderate'  # 100-1k stars
        else:
            return 'emerging'  # <100 stars
    
    def _generate_search_data(self, applications: List[Application]) -> Dict[str, Any]:
        """Generate search data for client-side search."""
        search_data = []
        
        for app in applications:
            search_entry = {
                'id': app.id,
                'name': app.name,
                'description': app.description,
                'url': app.url,
                'repo_url': app.repo_url,
                'demo_url': app.demo_url,
                'categories': app.categories,
                'tags': app.categories,  # Keep 'tags' key for JavaScript compatibility
                'license': app.license,
                'language': app.language,
                'platforms': app.platforms,
                'stars': app.stars or 0,
                'last_updated': app.last_updated,
                'depends_3rdparty': app.depends_3rdparty,
                'current_release': app.current_release,
                'commit_history': app.commit_history,
                'is_nonfree': self._is_app_nonfree(app)
            }
            search_data.append(search_entry)
        
        # Get non-free license identifiers for frontend
        nonfree_licenses = []
        if hasattr(self, 'licenses_data') and self.licenses_data:
            nonfree_licenses = [lic_id for lic_id, lic_info in self.licenses_data.items() 
                               if not lic_info.get('free', True)]
        
        return {
            'apps': search_data,
            'total': len(search_data),
            'nonfree_licenses': nonfree_licenses
        }
    
    def _generate_search_data_file(self, search_data: Dict[str, Any]):
        """Generate search data JSON file for client-side search."""
        search_file = self.config.output_dir / 'static' / 'data' / 'search.json'
        search_file.parent.mkdir(exist_ok=True)
        
        with open(search_file, 'w', encoding='utf-8') as f:
            json.dump(search_data, f, separators=(',', ':'))
        
        print("Search data file generated")
    
    def _generate_sitemap(self, applications: List[Application], categories: Dict):
        """Generate XML sitemap."""
        template = self.jinja_env.get_template('sitemap.xml')
        
        urls = [
            {'loc': '/', 'priority': '1.0'},  # Homepage (browse)
            {'loc': '/statistics.html', 'priority': '0.8'},  # Statistics page
        ]
        
        # Add application pages
        for app in applications:
            urls.append({
                'loc': f"/apps/{app.id}.html",
                'priority': '0.7'
            })
        
        content = template.render(
            urls=urls,
            site_url=self.config.get('site.url', 'https://awesome-selfhosted.net')
        )
        
        output_path = self.config.output_dir / 'sitemap.xml'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("Sitemap generated") 