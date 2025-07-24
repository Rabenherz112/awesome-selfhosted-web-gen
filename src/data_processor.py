"""
Data processing module for fetching and processing awesome-selfhosted data.
"""

import json
import yaml
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

from .config import Config


@dataclass
class Application:
    """Application data structure."""
    id: str
    name: str
    description: str
    url: str
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    categories: List[str] = None
    tags: List[str] = None
    license: List[str] = None  # Changed to list to support multiple licenses
    language: Optional[str] = None
    platforms: List[str] = None  # Added to store all platforms
    stars: Optional[int] = None
    forks: Optional[int] = None
    last_updated: Optional[str] = None
    depends_3rdparty: bool = False  # Added to track third-party dependencies
    current_release: Optional[Dict[str, str]] = None  # Added to store current release info
    commit_history: Optional[Dict[str, int]] = None  # Added to store monthly commit history
    
    def __post_init__(self):
        """Initialize default values."""
        if self.categories is None:
            self.categories = []
        if self.tags is None:
            self.tags = []
        if self.license is None:
            self.license = []
        if self.platforms is None:
            self.platforms = []


class DataProcessor:
    """Data processor for awesome-selfhosted dataset."""
    
    def __init__(self, config: Config):
        """Initialize data processor with configuration."""
        self.config = config
        
    def fetch_awesome_data(self) -> Dict[str, Any]:
        """Load all awesome-selfhosted data from local YAML files."""
        data_config = self.config.get_data_config()
        data_dir = Path(data_config['awesome_selfhosted_data_dir'])
        
        if not data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {data_dir}")
        
        # Load software data
        software_dir = data_dir / data_config['software_dir']
        apps_data = self._load_software_data(software_dir)
        
        # Load tags data
        tags_dir = data_dir / data_config['tags_dir']
        tags_data = self._load_tags_data(tags_dir)
        
        # Load platforms data
        platforms_dir = data_dir / data_config['platforms_dir']
        platforms_data = self._load_platforms_data(platforms_dir)
        
        # Load licenses data (both free and non-free)
        licenses_file = data_dir / data_config['licenses_file']
        licenses_nonfree_file = data_dir / 'licenses-nonfree.yml'
        licenses_data = self._load_licenses_data(licenses_file, licenses_nonfree_file)
        
        print(f"Loaded {len(apps_data)} applications, {len(tags_data)} tags, {len(platforms_data)} platforms, {len(licenses_data)} licenses")
        
        return {
            'apps': apps_data,
            'categories': tags_data,  # Using tags as categories
            'tags': tags_data,
            'platforms': platforms_data,
            'licenses': licenses_data
        }
    
    def _load_software_data(self, software_dir: Path) -> List[Dict]:
        """Load all software YAML files."""
        apps_data = []
        
        if not software_dir.exists():
            print(f"Warning: Software directory not found: {software_dir}")
            return apps_data
        
        yaml_files = list(software_dir.glob('*.yml'))
        print(f"Loading {len(yaml_files)} software files...")
        
        for yaml_file in yaml_files:
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    app_data = yaml.safe_load(f)
                    if app_data:  # Skip empty files
                        # Add the filename (without extension) as ID
                        app_data['id'] = yaml_file.stem
                        apps_data.append(app_data)
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")
        
        return apps_data
    
    def _load_tags_data(self, tags_dir: Path) -> Dict[str, Dict]:
        """Load all tag YAML files."""
        tags_data = {}
        
        if not tags_dir.exists():
            print(f"Warning: Tags directory not found: {tags_dir}")
            return tags_data
        
        yaml_files = list(tags_dir.glob('*.yml'))
        print(f"Loading {len(yaml_files)} tag files...")
        
        for yaml_file in yaml_files:
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    tag_data = yaml.safe_load(f)
                    if tag_data:
                        tag_id = yaml_file.stem
                        tags_data[tag_id] = {
                            'id': tag_id,
                            'name': tag_data.get('name', tag_id),
                            'description': tag_data.get('description', ''),
                            'external_links': tag_data.get('external_links', [])
                        }
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")
        
        return tags_data
    
    def _load_platforms_data(self, platforms_dir: Path) -> Dict[str, Dict]:
        """Load all platform YAML files."""
        platforms_data = {}
        
        if not platforms_dir.exists():
            print(f"Warning: Platforms directory not found: {platforms_dir}")
            return platforms_data
        
        yaml_files = list(platforms_dir.glob('*.yml'))
        print(f"Loading {len(yaml_files)} platform files...")
        
        for yaml_file in yaml_files:
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    platform_data = yaml.safe_load(f)
                    if platform_data:
                        platform_id = yaml_file.stem
                        platforms_data[platform_id] = {
                            'id': platform_id,
                            'name': platform_data.get('name', platform_id),
                            'description': platform_data.get('description', '')
                        }
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")
        
        return platforms_data
    
    def _load_licenses_data(self, licenses_file: Path, licenses_nonfree_file: Path) -> Dict[str, Dict]:
        """Load both free and non-free licenses YAML files."""
        licenses_data = {}
        
        # Load free licenses
        if licenses_file.exists():
            try:
                with open(licenses_file, 'r', encoding='utf-8') as f:
                    licenses_list = yaml.safe_load(f)
                    if licenses_list:
                        for license_info in licenses_list:
                            if license_info and 'identifier' in license_info:
                                license_id = license_info['identifier']
                                licenses_data[license_id] = {
                                    'id': license_id,
                                    'name': license_info.get('name', license_id),
                                    'url': license_info.get('url', ''),
                                    'free': True
                                }
            except Exception as e:
                print(f"Error loading {licenses_file}: {e}")
        else:
            print(f"Warning: Licenses file not found: {licenses_file}")
        
        # Load non-free licenses
        if licenses_nonfree_file.exists():
            try:
                with open(licenses_nonfree_file, 'r', encoding='utf-8') as f:
                    licenses_list = yaml.safe_load(f)
                    if licenses_list:
                        for license_info in licenses_list:
                            if license_info and 'identifier' in license_info:
                                license_id = license_info['identifier']
                                licenses_data[license_id] = {
                                    'id': license_id,
                                    'name': license_info.get('name', license_id),
                                    'url': license_info.get('url', ''),
                                    'free': False
                                }
            except Exception as e:
                print(f"Error loading {licenses_nonfree_file}: {e}")
        else:
            print(f"Note: Non-free licenses file not found: {licenses_nonfree_file}")
        
        return licenses_data

    def process_applications(self, raw_apps: List[Dict]) -> List[Application]:
        """Process raw application data into Application objects."""
        applications = []
        
        for app_data in raw_apps:
            # Use the ID that was set from filename
            app_id = app_data.get('id', self._create_app_id(app_data.get('name', '')))
            
            # Get repository URL
            repo_url = app_data.get('source_code_url')
            
            # Get platforms (languages/technologies) - keep all platforms
            platforms = app_data.get('platforms', [])
            # Ensure platforms is always a list (handle legacy cached data)
            if isinstance(platforms, str):
                platforms = [platforms] if platforms else []
            # Use first platform as primary language for compatibility, but store all
            primary_language = platforms[0] if platforms else None
            
            # Get licenses - keep all licenses
            licenses = app_data.get('licenses', [])
            # Ensure licenses is always a list (handle legacy cached data)
            if isinstance(licenses, str):
                licenses = [licenses] if licenses else []
            app = Application(
                id=app_id,
                name=app_data.get('name', ''),
                description=app_data.get('description', ''),
                url=app_data.get('website_url', ''),
                repo_url=repo_url,
                demo_url=app_data.get('demo_url'),
                categories=app_data.get('tags', []),  # Using tags as categories
                tags=app_data.get('tags', []),
                license=licenses,  # Store all licenses as list
                language=primary_language,
                platforms=platforms,  # Store all platforms
                stars=app_data.get('stargazers_count'),
                last_updated=app_data.get('updated_at'),
                depends_3rdparty=app_data.get('depends_3rdparty', False),
                current_release=app_data.get('current_release'),  # Extract release info
                commit_history=app_data.get('commit_history')  # Extract commit history
            )
            
            applications.append(app)
        
        return applications
    
    def _create_app_id(self, name: str) -> str:
        """Create a unique ID from application name."""
        import re
        # Convert to lowercase, replace spaces/special chars with hyphens
        app_id = re.sub(r'[^a-z0-9]+', '-', name.lower().strip())
        return app_id.strip('-')
    
    def generate_search_index(self, applications: List[Application]) -> Dict[str, Any]:
        """Generate search index for client-side search."""
        search_data = []
        
        for app in applications:
            search_entry = {
                'id': app.id,
                'name': app.name,
                'description': app.description,
                'url': app.url,
                'categories': app.categories,
                'tags': app.tags,
                'license': app.license,
                'language': app.language,
                'stars': app.stars or 0,
                'last_updated': app.last_updated
            }
            search_data.append(search_entry)
        
        return {
            'apps': search_data,
            'total': len(search_data),
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def create_category_hierarchy(self, applications: List[Application], categories_data: Dict) -> Dict[str, Any]:
        """Create category hierarchy with application counts."""
        category_counts = {}
        
        # Count applications per category (using tags as categories)
        for app in applications:
            for category in app.categories:
                # Convert category name to match tag file names (lowercase, replace spaces with dashes)
                category_key = category.lower().replace(' ', '-').replace('&', '').replace('(', '').replace(')', '').replace(',', '').replace('/', '-').replace('--', '-').strip('-')
                category_counts[category_key] = category_counts.get(category_key, 0) + 1
                # Also count with original name for exact matches
                category_counts[category] = category_counts.get(category, 0) + 1
        
        # Build hierarchy using loaded tag data
        categories = {}
        for category_id, category_info in categories_data.items():
            count = category_counts.get(category_id, 0)
            # Also check for exact name matches
            if count == 0:
                category_name = category_info.get('name', category_id)
                count = category_counts.get(category_name, 0)
            
            categories[category_id] = {
                'id': category_id,
                'name': category_info.get('name', category_id.replace('-', ' ').title()),
                'description': category_info.get('description', ''),
                'count': count
            }
        
        # Also create categories for tags that don't have dedicated files
        all_tags = set()
        for app in applications:
            all_tags.update(app.categories)
        
        for tag in all_tags:
            tag_key = tag.lower().replace(' ', '-').replace('&', '').replace('(', '').replace(')', '').replace(',', '').replace('/', '-').replace('--', '-').strip('-')
            if tag_key not in categories:
                categories[tag_key] = {
                    'id': tag_key,
                    'name': tag,
                    'description': f'Applications tagged with {tag}',
                    'count': category_counts.get(tag, 0)
                }
        
        return categories
    
    def generate_statistics(self, applications: List[Application], categories: Dict, tags: Dict) -> Dict[str, Any]:
        """Generate site statistics."""
        language_counts = {}
        license_counts = {}
        platform_counts = {}
        
        for app in applications:
            # Count primary languages
            if app.language:
                language_counts[app.language] = language_counts.get(app.language, 0) + 1
            
            # Count all platforms - ensure we have the platforms data
            if hasattr(app, 'platforms') and app.platforms:
                for platform in app.platforms:
                    if platform:  # Make sure platform is not empty
                        platform_counts[platform] = platform_counts.get(platform, 0) + 1
            
            # Count all licenses - ensure we have the license data  
            if hasattr(app, 'license') and app.license:
                for license_id in app.license:
                    if license_id:  # Make sure license is not empty
                        license_counts[license_id] = license_counts.get(license_id, 0) + 1
        
        # Calculate multi-platform and multi-license counts more carefully
        apps_with_multiple_licenses = sum(1 for app in applications 
                                        if hasattr(app, 'license') and app.license and len(app.license) > 1)
        apps_with_multiple_platforms = sum(1 for app in applications 
                                         if hasattr(app, 'platforms') and app.platforms and len(app.platforms) > 1)
        
        return {
            'total_apps': len(applications),
            'categories_count': len([c for c in categories.values() if c['count'] > 0]),
            'tags_count': len(tags),
            'top_languages': sorted(language_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            'top_platforms': sorted(platform_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            'top_licenses': sorted(license_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            'apps_with_github': len([app for app in applications if app.stars is not None]),
            'total_stars': sum(app.stars or 0 for app in applications),
            'apps_with_multiple_licenses': apps_with_multiple_licenses,
            'apps_with_multiple_platforms': apps_with_multiple_platforms
        } 