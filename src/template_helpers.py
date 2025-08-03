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
        slug = re.sub(r"[^a-z0-9]+", "-", text.lower().strip())
        return slug.strip("-")

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
            if "T" in date_str:
                # ISO datetime format (2023-12-01T10:30:00Z)
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                # Simple date format (2025-07-21)
                dt = datetime.strptime(date_str, "%Y-%m-%d")

            return dt.strftime("%B %d, %Y")
        except (ValueError, AttributeError) as e:
            print(f"Warning: Could not parse date '{date_str}': {e}")
            return date_str

    def truncate_description(self, description: str, length: int = None) -> str:
        """Truncate description to specified length."""
        if not description:
            return ""

        truncation_config = self.config.get("ui.truncation", {})
        if length is None:
            length = truncation_config.get("default_description_length", 150)
        show_full = truncation_config.get("browse_description_full", False)

        if show_full or len(description) <= length:
            return description

        truncated = description[:length]
        last_space = truncated.rfind(" ")

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
            return self.licenses_data[license_name]["name"]

        # Try case-insensitive match
        for license_id, license_info in self.licenses_data.items():
            if license_id.lower() == license_name.lower():
                return license_info["name"]

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

    def is_license_nonfree(self, license_id: str) -> bool:
        """Check if a single license is non-free."""
        if not license_id:
            return False

        # Get non-free license identifiers from loaded license data
        if hasattr(self, "licenses_data") and self.licenses_data:
            nonfree_licenses = {
                lic_id
                for lic_id, lic_info in self.licenses_data.items()
                if not lic_info.get("free", True)
            }
            return license_id in nonfree_licenses

        # Fallback to basic check if license data not available
        return license_id in ["⊘ Proprietary"]

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

    def get_categories_badges_html(self, categories) -> str:
        """Generate HTML badges for categories."""
        if not categories:
            return ""

        # Handle both list and string cases
        if isinstance(categories, str):
            categories = [categories]
        elif not isinstance(categories, list):
            return ""

        html_parts = []
        for category in categories:
            if category:
                html_parts.append(
                    f'<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm px-3 py-1 rounded-full">{category}</span>'
                )

        return " ".join(html_parts)

    def sort_by_stars(self, apps: List[Any], reverse: bool = True) -> List[Any]:
        """Sort applications by star count."""
        return sorted(apps, key=lambda x: x.stars or 0, reverse=reverse)

    def get_platform_color(self, platform: str) -> str:
        """Get color for platform/technology."""
        # Common platform colors (GitHub-style)
        colors = {
            "python": "#3572A5",
            "javascript": "#f1e05a",
            "typescript": "#2b7489",
            "java": "#b07219",
            "go": "#00ADD8",
            "rust": "#dea584",
            "php": "#4F5D95",
            "c": "#555555",
            "c++": "#f34b7d",
            "c#": "#239120",
            "ruby": "#701516",
            "shell": "#89e051",
            "docker": "#384d54",
            "html": "#e34c26",
            "css": "#563d7c",
            "vue": "#4FC08D",
            "react": "#61DAFB",
            "nodejs": "#43853d",
            "dart": "#00B4AB",
            "kotlin": "#F18E33",
            "swift": "#FA7343",
            "scala": "#c22d40",
        }

        if not platform:
            return "#6b7280"  # gray-500

        return colors.get(platform.lower(), "#6b7280")

    def render_template_string(self, template_str: str, context: dict = None) -> str:
        """Render a template string with given context."""
        if not template_str:
            return ""

        # Create a simple template from string
        from jinja2 import Template

        # Merge with site config by default
        full_context = {"site": self.config.get_site_config()}
        if context:
            full_context.update(context)

        try:
            template = Template(template_str)
            return template.render(**full_context)
        except Exception as e:
            print(f"Warning: Could not render template string '{template_str}': {e}")
            return template_str

    def get_link_target_attrs(self, url: str, is_internal: bool = None) -> str:
        """Get target and rel attributes for links based on configuration."""
        links_config = self.config.get("links", {})

        # Auto-detect if internal/external if not specified
        if is_internal is None:
            site_url = self.config.get("site.url", "")
            is_site_url = site_url and url.startswith(site_url)
            # For non-site URLs, check if it's a local path or file
            is_local = (
                url.startswith("/")
                or url.startswith("./")
                or url.startswith("../")
                or (
                    not url.startswith("http")
                    and (url.endswith(".html") or url.endswith(".htm"))
                )
            )

            is_internal = is_site_url or is_local

        target_attrs = ""

        if is_internal:
            if links_config.get("open_in_new_tab_for_internal_links", False):
                target_attrs = ' target="_blank" rel="noopener"'
            else:
                target_attrs = ' target="_self"'
        else:
            if links_config.get("open_in_new_tab_for_external_links", False):
                target_attrs = ' target="_blank" rel="noopener noreferrer"'
            else:
                target_attrs = ' target="_self"'

        return target_attrs

    def truncate_description(
        self, description: str, length: int = None, show_full: bool = None
    ) -> str:
        """Truncate description to specified length with configurable behavior."""
        if not description:
            return ""

        # Get truncation config from UI config
        truncation_config = self.config.get("ui.truncation", {})

        # Use provided length or fall back to config default
        if length is None:
            length = truncation_config.get("default_description_length", 150)

        # Check if full description should be shown
        if show_full is None:
            show_full = truncation_config.get("browse_description_full", False)

        if show_full or len(description) <= length:
            return description

        # Find the last space before the limit
        truncated = description[:length]
        last_space = truncated.rfind(" ")

        if last_space > 0:
            truncated = truncated[:last_space]

        return truncated + "..."

    def markdown_to_html(self, markdown_text: str) -> str:
        """Convert markdown text to HTML for footer content."""
        if not markdown_text:
            return ""

        import re

        html = markdown_text

        # Get footer configuration for section filtering
        footer_config = self.config.get("ui.footer_markdown", {})
        excluded_sections = footer_config.get("exclude_sections", [])

        # Remove excluded sections if configured
        if excluded_sections:
            for section in excluded_sections:
                # Remove section by header (case-insensitive)
                section_pattern = rf"^#+\s+{re.escape(section)}.*?(?=^#+|\Z)"
                html = re.sub(
                    section_pattern,
                    "",
                    html,
                    flags=re.MULTILINE | re.DOTALL | re.IGNORECASE,
                )

        # Remove horizontal rules (---- patterns)
        html = re.sub(r"^-{4,}\s*$", "", html, flags=re.MULTILINE)
        html = re.sub(r"^={4,}\s*$", "", html, flags=re.MULTILINE)

        # Remove relative links like [](#awesome-selfhosted) and empty links
        html = re.sub(r"\*\*\[[^\]]*\]\(#[^)]+\)\*\*", "", html)
        html = re.sub(r"\[[^\]]*\]\(#[^)]+\)", "", html)

        # Remove code blocks (backticks)
        html = re.sub(r"`[^`]*?`", "", html)

        # Convert links: [text](url) - use proper link target configuration
        def replace_link(match):
            text = match.group(1)
            url = match.group(2)

            # For markdown links, treat all URLs as external unless they are relative paths
            is_internal = (
                url.startswith("/")
                or url.startswith("./")
                or url.startswith("../")
                or url.startswith("#")
            )
            target_attrs = self.get_link_target_attrs(url, is_internal)
            return f'<a href="{url}"{target_attrs} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline">{text}</a>'

        html = re.sub(
            r"\[([^\]]+)\]\(([^)]+)\)", replace_link, html, flags=re.MULTILINE
        )

        # Convert headers (## and ### only)
        html = re.sub(
            r"^### (.+)$",
            r'<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8 text-center">\1</h3>',
            html,
            flags=re.MULTILINE,
        )
        html = re.sub(
            r"^## (.+)$",
            r'<h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">\1</h2>',
            html,
            flags=re.MULTILINE,
        )

        # Convert bold text - but skip if it contains empty links
        def replace_bold(match):
            content = match.group(1)
            # Skip if this contains an empty link pattern
            if re.search(r"\[\]\([^)]+\)", content):
                return match.group(0)  # Return unchanged
            return f'<strong class="font-semibold">{content}</strong>'

        html = re.sub(r"\*\*([^*]+)\*\*", replace_bold, html)

        # Split into paragraphs and process
        paragraphs = html.split("\n\n")
        html_paragraphs = []

        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            # Skip if it's already a header
            if paragraph.startswith("<h"):
                html_paragraphs.append(paragraph)
            else:
                # Check if this is an unordered list
                lines = paragraph.split("\n")
                is_unordered_list = all(
                    line.strip().startswith("- ") or line.strip() == ""
                    for line in lines
                    if line.strip()
                )

                if is_unordered_list and any(
                    line.strip().startswith("- ") for line in lines
                ):
                    # Convert to unordered list
                    list_items = []
                    for line in lines:
                        line = line.strip()
                        if line.startswith("- "):
                            item_content = line[2:].strip()
                            list_items.append(
                                f'<li class="text-gray-700 dark:text-gray-300 mb-2">{item_content}</li>'
                            )

                    if list_items:
                        html_paragraphs.append(
                            f'<ul class="list-disc list-inside mb-4 space-y-1">\n{"".join(list_items)}\n</ul>'
                        )
                else:
                    # Handle as regular paragraph
                    processed_lines = []

                    for line in lines:
                        line = line.strip()
                        if line:
                            processed_lines.append(line)

                    if processed_lines:
                        # Join lines with space and wrap in paragraph
                        paragraph_content = " ".join(processed_lines)
                        html_paragraphs.append(
                            f'<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-center">{paragraph_content}</p>'
                        )

        # Join all paragraphs
        html = "\n\n".join(html_paragraphs)

        # Clean up any extra whitespace left from removed sections
        html = re.sub(r"\n{3,}", "\n\n", html)
        html = html.strip()

        return html

    def style_description_links(self, description: str) -> str:
        """Add proper styling to links in description text."""
        import re

        if not description:
            return ""

        # Style any <a> tags that don't already have classes
        def style_link(match):
            full_tag = match.group(0)
            # If it already has a class attribute, don't modify
            if "class=" in full_tag:
                return full_tag

            # Extract href and content
            href_match = re.search(r'href="([^"]*)"', full_tag)
            content_match = re.search(r">([^<]*)</a>", full_tag)

            if href_match and content_match:
                href = href_match.group(1)
                content = content_match.group(1)

                # Add proper target attributes using the helper
                target_attrs = self.get_link_target_attrs(
                    href, not href.startswith("http")
                )

                return f'<a href="{href}"{target_attrs} class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline font-medium">{content}</a>'

            return full_tag

        return re.sub(r"<a[^>]*>.*?</a>", style_link, description)
