"""
Data processing module for fetching and processing awesome-selfhosted data.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

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
    related_software_url: Optional[str] = None
    categories: List[str] = None
    license: List[str] = None
    platforms: List[str] = None
    stars: Optional[int] = None
    forks: Optional[int] = None
    last_updated: Optional[str] = None
    depends_3rdparty: bool = False
    current_release: Optional[Dict[str, str]] = None
    commit_history: Optional[Dict[str, int]] = None
    # Special annotations parsed from description
    fork_of: Optional[str] = None
    fork_url: Optional[str] = None
    alternative_to: List[str] = None
    documentation_language: Optional[str] = None

    def __post_init__(self):
        """Initialize default values."""
        if self.categories is None:
            self.categories = []
        if self.license is None:
            self.license = []
        if self.platforms is None:
            self.platforms = []
        if self.alternative_to is None:
            self.alternative_to = []


class DataProcessor:
    """Data processor for awesome-selfhosted dataset."""

    def __init__(self, config: Config):
        """Initialize data processor with configuration."""
        self.config = config

    def fetch_awesome_data(self) -> Dict[str, Any]:
        """Load all awesome-selfhosted data from local YAML files."""
        data_config = self.config.get_data_config()
        data_dir = Path(data_config["data_dir"])

        if not data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {data_dir}")

        # Load software data
        software_dir = data_dir / data_config["software_dir"]
        apps_data = self._load_software_data(software_dir)

        # Load categories data
        categories_dir = data_dir / data_config["categories_dir"]
        categories_data = self._load_categories_data(categories_dir)

        # Load platforms data
        platforms_dir = data_dir / data_config["platforms_dir"]
        platforms_data = self._load_platforms_data(platforms_dir)

        # Load licenses data (both free and non-free)
        licenses_file = data_dir / data_config["licenses_file"]
        licenses_nonfree_file = data_dir / data_config["licenses_nonfree_file"]
        licenses_data = self._load_licenses_data(licenses_file, licenses_nonfree_file)

        # Load markdown files
        markdown_data = self._load_markdown_files(data_dir)

        print(
            f"Loaded {len(apps_data)} applications, {len(categories_data)} categories, {len(platforms_data)} platforms, {len(licenses_data)} licenses"
        )

        return {
            "apps": apps_data,
            "categories": categories_data,
            "platforms": platforms_data,
            "licenses": licenses_data,
            "markdown": markdown_data,
        }

    def _load_software_data(self, software_dir: Path) -> List[Dict]:
        """Load all software YAML files."""
        apps_data = []

        if not software_dir.exists():
            print(f"Warning: Software directory not found: {software_dir}")
            return apps_data

        yaml_files = list(software_dir.glob("*.yml"))
        print(f"Loading {len(yaml_files)} software files...")

        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    app_data = yaml.safe_load(f)
                    if app_data:  # Skip empty files
                        # Add the filename (without extension) as ID
                        app_data["id"] = yaml_file.stem
                        apps_data.append(app_data)
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")

        return apps_data

    def _load_categories_data(self, categories_dir: Path) -> Dict[str, Dict]:
        """Load all category YAML files."""
        categories_data = {}

        if not categories_dir.exists():
            print(f"Warning: Categories directory not found: {categories_dir}")
            return categories_data

        yaml_files = list(categories_dir.glob("*.yml"))
        print(f"Loading {len(yaml_files)} category files...")

        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    tag_data = yaml.safe_load(f)
                    if tag_data:
                        category_id = yaml_file.stem
                        categories_data[category_id] = {
                            "id": category_id,
                            "name": tag_data.get("name", category_id),
                            "description": tag_data.get("description", ""),
                            "external_links": tag_data.get("external_links", []),
                        }
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")

        return categories_data

    def _load_platforms_data(self, platforms_dir: Path) -> Dict[str, Dict]:
        """Load all platform YAML files."""
        platforms_data = {}

        if not platforms_dir.exists():
            print(f"Warning: Platforms directory not found: {platforms_dir}")
            return platforms_data

        yaml_files = list(platforms_dir.glob("*.yml"))
        print(f"Loading {len(yaml_files)} platform files...")

        for yaml_file in yaml_files:
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    platform_data = yaml.safe_load(f)
                    if platform_data:
                        platform_id = yaml_file.stem
                        platforms_data[platform_id] = {
                            "id": platform_id,
                            "name": platform_data.get("name", platform_id),
                            "description": platform_data.get("description", ""),
                        }
            except Exception as e:
                print(f"Error loading {yaml_file}: {e}")

        return platforms_data

    def _load_licenses_data(
        self, licenses_file: Path, licenses_nonfree_file: Path
    ) -> Dict[str, Dict]:
        """Load both free and non-free licenses YAML files."""
        licenses_data = {}

        # Load free licenses
        if licenses_file.exists():
            try:
                with open(licenses_file, "r", encoding="utf-8") as f:
                    licenses_list = yaml.safe_load(f)
                    if licenses_list:
                        for license_info in licenses_list:
                            if license_info and "identifier" in license_info:
                                license_id = license_info["identifier"]
                                licenses_data[license_id] = {
                                    "id": license_id,
                                    "name": license_info.get("name", license_id),
                                    "url": license_info.get("url", ""),
                                    "free": True,
                                }
            except Exception as e:
                print(f"Error loading {licenses_file}: {e}")
        else:
            print(f"Warning: Licenses file not found: {licenses_file}")

        # Load non-free licenses
        if licenses_nonfree_file.exists():
            try:
                with open(licenses_nonfree_file, "r", encoding="utf-8") as f:
                    licenses_list = yaml.safe_load(f)
                    if licenses_list:
                        for license_info in licenses_list:
                            if license_info and "identifier" in license_info:
                                license_id = license_info["identifier"]
                                licenses_data[license_id] = {
                                    "id": license_id,
                                    "name": license_info.get("name", license_id),
                                    "url": license_info.get("url", ""),
                                    "free": False,
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
            app_id = app_data.get("id", self._create_app_id(app_data.get("name", "")))

            # Get repository URL
            repo_url = app_data.get("source_code_url")

            # Get platforms (technologies/languages) - keep all platforms
            platforms = app_data.get("platforms", [])
            # Ensure platforms is always a list (handle legacy cached data)
            if isinstance(platforms, str):
                platforms = [platforms] if platforms else []

            # Get licenses - keep all licenses
            licenses = app_data.get("licenses", [])
            # Ensure licenses is always a list (handle legacy cached data)
            if isinstance(licenses, str):
                licenses = [licenses] if licenses else []

            # Parse description annotations
            desc_data = self._parse_description_annotations(
                app_data.get("description", "")
            )

            app = Application(
                id=app_id,
                name=app_data.get("name", ""),
                description=desc_data["description"],
                url=app_data.get("website_url", ""),
                repo_url=repo_url,
                demo_url=app_data.get("demo_url"),
                related_software_url=app_data.get("related_software_url"),
                categories=app_data.get("tags", []),
                license=licenses,
                platforms=platforms,
                stars=app_data.get("stargazers_count"),
                last_updated=app_data.get("updated_at"),
                depends_3rdparty=app_data.get("depends_3rdparty", False),
                current_release=app_data.get("current_release"),
                commit_history=app_data.get("commit_history"),
                # Parsed annotations
                fork_of=desc_data["fork_of"],
                fork_url=desc_data["fork_url"],
                alternative_to=desc_data["alternative_to"],
                documentation_language=desc_data["documentation_language"],
            )

            applications.append(app)

        return applications

    def _create_app_id(self, name: str) -> str:
        """Create a unique ID from application name."""
        import re

        # Convert to lowercase, replace spaces/special chars with hyphens
        app_id = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
        return app_id.strip("-")

    def _parse_description_annotations(self, description: str) -> Dict[str, Any]:
        """Parse special annotations from description and return cleaned description with extracted data."""
        import re

        if not description:
            return {
                "description": "",
                "fork_of": None,
                "fork_url": None,
                "alternative_to": [],
                "documentation_language": [],
            }

        cleaned_description = description
        fork_of = None
        fork_url = None
        alternative_to = []
        documentation_language = []

        # Parse (documentation in $LANGUAGE) or (documentation in $LANG1, $LANG2)
        doc_pattern = r"\s*\(\s*documentation\s+in\s+([^)]+)\)\s*\.?"
        doc_match = re.search(doc_pattern, cleaned_description, re.IGNORECASE)
        if doc_match:
            doc_languages_str = doc_match.group(1).strip()
            # Split by commas and 'and' to support multiple languages
            doc_languages_raw = re.split(
                r"\s*,\s*|\s+and\s+", doc_languages_str, flags=re.IGNORECASE
            )
            for lang in doc_languages_raw:
                lang_clean = lang.strip()
                if lang_clean:
                    documentation_language.append(lang_clean)
            # Remove the documentation annotation from description
            cleaned_description = re.sub(
                doc_pattern, "", cleaned_description, flags=re.IGNORECASE
            )

        # Parse (fork of $PROJECT) - handle both markdown links and plain text
        # This was the worst to filter out, if anybody wants to improve this, feel free to do so. I will not touch this ever again.
        md_fork_pattern = re.compile(
            r"\(\s*fork\s+of\s*\[([^\]]+)\]\(([^)]+)\)\s*\)\s*\.?", re.IGNORECASE
        )
        md_match = md_fork_pattern.search(cleaned_description)
        if md_match:
            fork_of = md_match.group(1).strip()
            fork_url = md_match.group(2).strip()
            cleaned_description = md_fork_pattern.sub("", cleaned_description)
        else:
            plain_fork_pattern = re.compile(
                r"\(\s*fork\s+of\s+([^)]+?)\)\s*\.?", re.IGNORECASE
            )
            plain_fork_match = plain_fork_pattern.search(cleaned_description)
            if plain_fork_match:
                fork_of = plain_fork_match.group(1).strip()
                fork_url = None
                cleaned_description = plain_fork_pattern.sub("", cleaned_description)

        # Parse (alternative to $PRODUCT1, $PRODUCT2) or (alternative to $PRODUCT1 and $PRODUCT2)
        alt_pattern = r"\s*\(\s*alternative\s+to\s+([^)]+)\)\s*\.?"
        alt_match = re.search(alt_pattern, cleaned_description, re.IGNORECASE)
        if alt_match:
            alternatives_str = alt_match.group(1).strip()
            # Split by commas and 'and' to support multiple alternatives
            alternatives_raw = re.split(
                r"\s*,\s*|\s+and\s+", alternatives_str, flags=re.IGNORECASE
            )
            for alt in alternatives_raw:
                alt_clean = alt.strip()
                # Remove common suffixes and filter out empty/meaningless entries
                alt_clean = re.sub(
                    r"\s+(and\s+)?others?$", "", alt_clean, flags=re.IGNORECASE
                )
                alt_clean = re.sub(
                    r"\s+similar\s+services?$", "", alt_clean, flags=re.IGNORECASE
                )
                if alt_clean and alt_clean.lower() not in [
                    "others",
                    "similar",
                    "services",
                    "etc",
                ]:
                    alternative_to.append(alt_clean)
            # Remove the alternative annotation from description
            cleaned_description = re.sub(
                alt_pattern, "", cleaned_description, flags=re.IGNORECASE
            )

        # Clean up any extra whitespace and trailing periods
        cleaned_description = re.sub(r"\s+", " ", cleaned_description.strip())
        cleaned_description = cleaned_description.rstrip(".")

        return {
            "description": cleaned_description,
            "fork_of": fork_of,
            "fork_url": fork_url,
            "alternative_to": alternative_to,
            "documentation_language": documentation_language,
        }

    def create_category_hierarchy(
        self, applications: List[Application], categories_data: Dict
    ) -> Dict[str, Any]:
        """Create category hierarchy with application counts."""
        category_counts = {}

        # Helper function to create consistent slugs
        def slugify(text):
            return (
                text.lower()
                .replace(" ", "-")
                .replace("&", "")
                .replace("(", "")
                .replace(")", "")
                .replace(",", "")
                .replace("/", "-")
                .replace("--", "-")
                .strip("-")
            )

        # Count applications per category
        for app in applications:
            for category in app.categories:
                # Count by original name
                category_counts[category] = category_counts.get(category, 0) + 1
                # Also count by slugified version
                category_key = slugify(category)
                category_counts[category_key] = category_counts.get(category_key, 0) + 1

        # Build hierarchy using loaded tag data
        categories = {}
        for category_id, category_info in categories_data.items():
            count = category_counts.get(category_id, 0)
            # Also check for exact name matches
            if count == 0:
                category_name = category_info.get("name", category_id)
                count = category_counts.get(category_name, 0)

            categories[category_id] = {
                "id": category_id,
                "name": category_info.get(
                    "name", category_id.replace("-", " ").title()
                ),
                "description": category_info.get("description", ""),
                "count": count,
            }

        # Also create categories that don't have dedicated files
        all_categories = set()
        for app in applications:
            all_categories.update(app.categories)

        for category in all_categories:
            # Create a consistent category key (same as used in URL generation)
            category_key = slugify(category)
            if category_key not in categories:
                categories[category_key] = {
                    "id": category_key,
                    "name": category,
                    "description": f"Applications in category {category}",
                    "count": category_counts.get(category, 0),
                    "original_name": category,  # Store original name for matching
                }

        return categories

    def generate_statistics(
        self, applications: List[Application], categories: Dict
    ) -> Dict[str, Any]:
        """Generate site statistics."""
        license_counts = {}
        platform_counts = {}

        for app in applications:
            # Count all platforms - ensure we have the platforms data
            if hasattr(app, "platforms") and app.platforms:
                for platform in app.platforms:
                    if platform:  # Make sure platform is not empty
                        platform_counts[platform] = platform_counts.get(platform, 0) + 1

            # Count all licenses - ensure we have the license data
            if hasattr(app, "license") and app.license:
                for license_id in app.license:
                    if license_id:  # Make sure license is not empty
                        license_counts[license_id] = (
                            license_counts.get(license_id, 0) + 1
                        )

        # Calculate multi-platform and multi-license counts
        apps_with_multiple_licenses = sum(
            1
            for app in applications
            if hasattr(app, "license") and app.license and len(app.license) > 1
        )
        apps_with_multiple_platforms = sum(
            1
            for app in applications
            if hasattr(app, "platforms") and app.platforms and len(app.platforms) > 1
        )

        return {
            "total_apps": len(applications),
            "categories_count": len([c for c in categories.values() if c["count"] > 0]),
            "categories_count": len(categories),
            "total_platforms": len(platform_counts),
            "total_licenses": len(license_counts),
            "top_platforms": sorted(
                platform_counts.items(), key=lambda x: x[1], reverse=True
            )[:10],
            "top_licenses": sorted(
                license_counts.items(), key=lambda x: x[1], reverse=True
            )[:10],
            "apps_with_github": len(
                [app for app in applications if app.stars is not None]
            ),
            "total_stars": sum(app.stars or 0 for app in applications),
            "apps_with_multiple_licenses": apps_with_multiple_licenses,
            "apps_with_multiple_platforms": apps_with_multiple_platforms,
        }

    def generate_alternatives_data(self, applications: List[Application]) -> Dict[str, Any]:
        """Generate alternatives data for the alternatives page."""
        alternatives_map = {}
        
        for app in applications:
            if app.alternative_to:
                for alternative in app.alternative_to:
                    # Normalize the alternative name (case-insensitive, strip whitespace)
                    alt_key = alternative.strip()
                    if alt_key:
                        if alt_key not in alternatives_map:
                            alternatives_map[alt_key] = []
                        alternatives_map[alt_key].append(app)
        
        # Sort alternatives by name and sort apps within each alternative by stars
        sorted_alternatives = {}
        for alt_name in sorted(alternatives_map.keys(), key=str.lower):
            apps = alternatives_map[alt_name]
            # Sort apps by stars (descending), then by name
            sorted_apps = sorted(apps, key=lambda x: (-(x.stars or 0), x.name.lower()))
            sorted_alternatives[alt_name] = sorted_apps
        
        # Calculate statistics
        total_alternatives = len(sorted_alternatives)
        total_alternative_apps = len([app for app in applications if app.alternative_to])
        most_alternatives = max(len(apps) for apps in sorted_alternatives.values()) if sorted_alternatives else 0
        
        return {
            'alternatives': sorted_alternatives,
            'statistics': {
                'total_alternatives': total_alternatives,
                'total_alternative_apps': total_alternative_apps,
                'most_alternatives': most_alternatives,
                'avg_alternatives_per_software': round(sum(len(apps) for apps in sorted_alternatives.values()) / total_alternatives, 1) if  total_alternatives > 0 else 0
            }
        }

    def _load_markdown_files(self, data_dir: Path) -> Dict[str, str]:
        """Load markdown files (footer.md only now)."""
        markdown_files = {}

        # Only load footer now, header is configurable
        footer_file = data_dir / "markdown" / "footer.md"

        if footer_file.exists():
            try:
                with open(footer_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    markdown_files["footer"] = content
            except Exception as e:
                print(f"Error loading footer.md: {e}")
                markdown_files["footer"] = ""
        else:
            print(f"Warning: footer.md not found at {footer_file}")
            markdown_files["footer"] = ""

        return markdown_files
