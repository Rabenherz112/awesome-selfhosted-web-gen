"""
Site generation module using Jinja2 templates.
"""

import json
import shutil
from pathlib import Path
from typing import Dict, List, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape

try:
    from minify_html import minify

    MINIFY_AVAILABLE = True
except ImportError:
    MINIFY_AVAILABLE = False

from .config import Config
from .data_processor import Application, DataProcessor
from .template_helpers import TemplateHelpers


class SiteGenerator:
    """Static site generator using Jinja2 templates."""

    def __init__(self, config: Config):
        """Initialize site generator with configuration."""
        self.config = config
        self.template_helpers = TemplateHelpers(config)
        self.related_apps_config = self.config.get("related_apps", {})

        # Set up Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(config.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Register template helpers
        self._register_template_functions()

    def _register_template_functions(self):
        """Register custom template functions and filters."""
        # Global functions
        self.jinja_env.globals.update(
            {
                "site_config": self.config.get_site_config(),
                "ui_config": self.config.get("ui", {}),
                "footer_config": self.config.get("footer", {}),
                "hero_config": self.config.get("hero", {}),
                "navigation_config": self.config.get("navigation", {}),
                "pages_config": self.config.get("pages", {}),
                "links_config": self.config.get("links", {}),
                "robots_config": self.config.get("robots", {}),
                "related_apps_config": self.config.get("related_apps", {}),
                "generation_config": self.config.get_generation_config(),
                "search_config": self.config.get_search_config(),
                "performance_config": self.config.get_performance_config(),
                "format_stars": self.template_helpers.format_stars,
                "format_date": self.template_helpers.format_date,
                "format_license": self.template_helpers.format_license,
                "format_licenses": self.template_helpers.format_licenses,
                "is_license_nonfree": self.template_helpers.is_license_nonfree,
                "format_platforms": self.template_helpers.format_platforms,
                "get_platforms_badges_html": self.template_helpers.get_platforms_badges_html,
                "get_categories_badges_html": self.template_helpers.get_categories_badges_html,
                "truncate_description": self.template_helpers.truncate_description,
                "get_app_url": self.template_helpers.get_app_url,
                "get_platform_color": self.template_helpers.get_platform_color,
                "render_template_string": self.template_helpers.render_template_string,
                "get_link_target_attrs": self.template_helpers.get_link_target_attrs,
                "markdown_to_html": self.template_helpers.markdown_to_html,
                "style_description_links": self.template_helpers.style_description_links,
                "process_banner_text": self.template_helpers.process_banner_text,
                "base_path": self.config.get("site.base_path", "").rstrip("/"),
                "url_for": self.template_helpers.url_for,
                "asset_url": self.template_helpers.asset_url,
                "filter_navigation": self.template_helpers.filter_navigation,
            }
        )

        # Custom filters
        self.jinja_env.filters.update(
            {
                "slugify": self.template_helpers.slugify,
                "sort_by_stars": self.template_helpers.sort_by_stars,
            }
        )

    def generate_site(
        self,
        applications: List[Application],
        categories: Dict,
        statistics: Dict,
        licenses: Dict = None,
        markdown_data: Dict = None,
    ):
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
        if self.config.get("generation.enable_search_index", True):
            search_data = self._generate_search_data(applications)
            self._generate_search_data_file(search_data)
            print("Search index enabled - search data generated")
        else:
            search_data = None
            print("Search index disabled - skipping search data generation")

        # Generate pages
        self._generate_homepage(applications, categories, statistics, markdown_data)
        self._generate_browse_page(applications, categories)
        self._generate_statistics_page(applications, categories, statistics)
        self._generate_app_detail_pages(applications)

        # Generate alternatives page
        if self.config.get("alternatives.enabled", False):
            self._generate_alternatives_page(applications)
            # Generate alternatives data file for client-side loading
            alternatives_data = self._generate_alternatives_data_file(applications)
            print("Alternatives data file generated")

        # Generate additional files
        if self.config.get("generation.generate_sitemap", True):
            self._generate_sitemap(applications)
        else:
            print("Sitemap generation disabled - skipping sitemap.xml")
        self._generate_robots_txt()

        # Show minification status
        if self.config.get("generation.minify_html", False):
            if MINIFY_AVAILABLE:
                print("HTML minification enabled")
            else:
                print("HTML minification enabled but minify-html library not available")
        else:
            print("HTML minification disabled")

        print(f"Site generation complete! Output in: {self.config.output_dir}")

    def _copy_static_assets(self):
        """Copy static assets to output directory."""
        if self.config.static_dir.exists():
            output_static = self.config.output_dir / "static"

            # Remove existing static directory
            if output_static.exists():
                shutil.rmtree(output_static)

            # Files to exclude from copying
            exclude_files = {'tailwind-input.css'}

            # Copy static files
            for item in self.config.static_dir.rglob('*'):
                if item.is_file() and item.name not in exclude_files:
                    rel_path = item.relative_to(self.config.static_dir)
                    dst_path = output_static / rel_path
                    dst_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dst_path)
            print("Static assets copied")

    def _generate_homepage(
        self,
        applications: List[Application],
        categories: Dict,
        statistics: Dict,
        markdown_data: Dict = None,
    ):
        """Generate the homepage."""
        template = self.jinja_env.get_template("pages/index.html")

        homepage_config = self.config.get("ui.homepage", {})
        limits = self.config.get("ui.limits", {})
        include_nonfree = homepage_config.get("include_nonfree", True)

        # Filter applications based on include_nonfree setting
        if include_nonfree:
            filtered_apps = applications
        else:
            filtered_apps = [
                app for app in applications if not self._is_app_nonfree(app)
            ]

        # Get popular applications (top starred)
        popular_apps = sorted(
            [app for app in filtered_apps if app.stars],
            key=lambda x: x.stars or 0,
            reverse=True,
        )[: limits.get("homepage_popular_apps", 12)]

        # Get recent updates
        recent_apps = sorted(
            [app for app in filtered_apps if app.last_updated],
            key=lambda x: x.last_updated or "",
            reverse=True,
        )[: limits.get("homepage_recently_updated", 8)]

        # Get random picks (high quality apps with good ratings)
        import random

        quality_apps = [app for app in filtered_apps if app.stars and app.stars >= 100]
        random.shuffle(quality_apps)
        random_picks = quality_apps[: limits.get("homepage_random_picks", 6)]

        # Get alternatives
        top_alternatives = []
        if self.config.get("alternatives.enabled", False):
            processor = DataProcessor(self.config)
            alternatives_data = processor.generate_alternatives_data(applications)

            # Get top alternatives (by number of alternative apps)
            min_alternatives = self.config.get("alternatives.min_alternatives", 2)
            filtered_alternatives = {
            name: apps for name, apps in alternatives_data['alternatives'].items()
            if len(apps) >= min_alternatives
            }

            # Sort by number of alternatives and take top ones for homepage
            top_alternatives = sorted(
                filtered_alternatives.items(),
                key=lambda x: len(x[1]),
                reverse=True
            )[: limits.get("homepage_alternatives", 6)]

        # Get top categories by app count
        category_stats = []
        for cat_id, cat_info in categories.items():
            if cat_info["count"] > 0:
                # Create slugified version of the category name for consistent URLs
                category_name = cat_info["name"]
                category_slug = self.template_helpers.slugify(category_name)

                category_stats.append(
                    {
                        "id": cat_id,
                        "name": category_name,
                        "count": cat_info["count"],
                        "url": f"/browse.html?category={category_slug}",
                    }
                )

        category_stats.sort(key=lambda x: x["count"], reverse=True)

        content = template.render(
            popular_apps=popular_apps,
            recent_apps=recent_apps,
            random_picks=random_picks,
            alternatives=top_alternatives,
            categories=category_stats[: limits.get("homepage_popular_categories", 8)],
            statistics=statistics,
            total_applications=len(applications),
            markdown_data=markdown_data or {},
            homepage_config=homepage_config,
            page_title=None,  # Use site title for homepage
        )

        # Minify HTML if enabled
        content = self._minify_html_if_enabled(content)

        output_path = self.config.output_dir / "index.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print("Homepage generated")

    def _generate_browse_page(self, applications: List[Application], categories: Dict):
        """Generate the browse page at /browse.html with client-side pagination."""
        template = self.jinja_env.get_template("pages/browse.html")

        # Generate single page with empty applications (JavaScript will populate)
        content = template.render(
            applications=[],  # Empty - JavaScript will handle all rendering
            categories=categories,
            total_applications=len(applications),
            items_per_page=self.config.get("generation.items_per_page", 24),
            page_title="Browse Applications",
        )

        # Minify HTML if enabled
        content = self._minify_html_if_enabled(content)

        # Save browse page
        output_path = self.config.output_dir / "browse.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(
            f"Browse page generated (client-side rendering for {len(applications)} apps)"
        )

    def _generate_browse_as_homepage(
        self, applications: List[Application], categories: Dict
    ):
        """Generate the browse page as homepage (index.html) with client-side pagination."""
        # This has been deprecated in favor of _generate_homepage, however I will keep it here for now for reference and future use
        template = self.jinja_env.get_template("pages/browse.html")

        # Sort applications by name by default for initial display
        sorted_apps = sorted(applications, key=lambda x: x.name.lower())

        # Generate single page with empty applications (JavaScript will populate)
        content = template.render(
            applications=[],  # Empty - JavaScript will handle all rendering
            categories=categories,
            total_applications=len(applications),
            items_per_page=self.config.get("generation.items_per_page", 24),
            page_title="Browse Applications",
        )

        # Minify HTML if enabled
        content = self._minify_html_if_enabled(content)

        # Save single homepage
        output_path = self.config.output_dir / "index.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(
            f"Browse page generated (client-side rendering for {len(applications)} apps)"
        )

    def _generate_alternatives_page(self, applications: List[Application]):
        """Generate the alternatives page."""
        from .data_processor import DataProcessor
        from dataclasses import asdict

        processor = DataProcessor(self.config)
        alternatives_data = processor.generate_alternatives_data(applications)

        # Apply minimum alternatives filter
        min_alternatives = self.config.get("alternatives.min_alternatives", 2)
        filtered_alternatives_raw = {
            name: apps for name, apps in alternatives_data['alternatives'].items()
            if len(apps) >= min_alternatives
        }

        # Convert Application objects to dictionaries for JSON serialization
        filtered_alternatives = {}
        for name, apps in filtered_alternatives_raw.items():
            filtered_alternatives[name] = [asdict(app) for app in apps]

        template = self.jinja_env.get_template("pages/alternatives.html")

        content = template.render(
            alternatives=filtered_alternatives,
            alternatives_statistics=alternatives_data['statistics'],
            total_software=len(filtered_alternatives),
            total_alternatives=sum(len(apps) for apps in filtered_alternatives.values()),
            total_all_applications=len(applications),  # Total applications in the dataset
            alternatives_config=self.config.get("alternatives", {}),
            page_title="Alternative Software"
        )

        # Minify HTML if enabled
        content = self._minify_html_if_enabled(content)

        output_path = self.config.output_dir / "alternatives.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Alternatives page generated ({len(filtered_alternatives)} software with alternatives)")

    def _generate_statistics_page(
        self, applications: List[Application], categories: Dict, statistics: Dict):
        """Generate the statistics page."""
        template = self.jinja_env.get_template("pages/statistics.html")

        content = template.render(
            applications=applications,
            categories=categories,
            statistics=statistics,
            page_title="Statistics",
        )

        # Minify HTML if enabled
        content = self._minify_html_if_enabled(content)

        output_path = self.config.output_dir / "statistics.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print("Statistics page generated")

    def _generate_app_detail_pages(self, applications: List[Application]):
        """Generate individual application detail pages."""
        template = self.jinja_env.get_template("pages/app_detail.html")
        related_apps_limit = self.config.get("ui.limits.related_apps", 6)

        # Create apps directory
        apps_dir = self.config.output_dir / "apps"
        apps_dir.mkdir(exist_ok=True)

        if (
            self.related_apps_config.get("scoring", {})
            .get("semantic_similarity", {})
            .get("enabled", True)
        ):
            print(
                "Semantic similarity scoring is enabled. The generation of the app detail pages will take longer..."
            )

        for app in applications:
            # Find related applications
            related_apps = self._find_related_apps(app, applications)

            content = template.render(
                app=app,
                related_apps=related_apps[:related_apps_limit],
                page_title=f"{app.name} - Self-Hosted Application",
            )

            # Minify HTML if enabled
            content = self._minify_html_if_enabled(content)

            output_path = apps_dir / f"{app.id}.html"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(content)

        print(f"Application detail pages generated ({len(applications)} apps)")

    def _find_related_apps(
        self, target_app: Application, all_applications: List[Application]
    ) -> List[Application]:
        """Find applications related to the target app."""
        related = []
        config = self.related_apps_config
        scoring_config = config.get("scoring", {})

        debug = config.get("debug", False)
        if debug:
            print(f"\n=== Finding related apps for {target_app.name} ===")

        for app in all_applications:
            if app.id == target_app.id:
                continue

            score = 0
            score_breakdown = {}

            # 1. Semantic similarity in descriptions
            if scoring_config.get("semantic_similarity", {}).get("enabled", True):
                semantic_score = self._calculate_semantic_similarity(target_app, app)
                score += semantic_score
                score_breakdown["semantic"] = semantic_score

            # 2. Same categories
            if scoring_config.get("categories", {}).get("enabled", True):
                common_categories = set(app.categories or []) & set(
                    target_app.categories or []
                )
                category_score = len(common_categories) * scoring_config.get(
                    "categories", {}
                ).get("points_per_match", 4)
                score += category_score
                score_breakdown["categories"] = category_score

            # 3. Alternative-to relationships
            if scoring_config.get("alternatives", {}).get("enabled", True):
                alt_score = self._calculate_alternative_similarity(
                    target_app, app, scoring_config
                )
                score += alt_score
                score_breakdown["alternatives"] = alt_score

            # 4. Fork relationships
            if scoring_config.get("forks", {}).get("enabled", True):
                fork_score = self._calculate_fork_similarity(
                    target_app, app, scoring_config
                )
                score += fork_score
                score_breakdown["forks"] = fork_score

            # 5. Similar platform support
            if scoring_config.get("platforms", {}).get("enabled", True):
                common_platforms = set(app.platforms or []) & set(
                    target_app.platforms or []
                )
                platform_score = len(common_platforms) * scoring_config.get(
                    "platforms", {}
                ).get("points_per_match", 2)
                score += platform_score
                score_breakdown["platforms"] = platform_score

            # 6. Same license type (free vs non-free)
            if scoring_config.get("license", {}).get("enabled", True):
                if app.license and target_app.license:
                    target_is_nonfree = self._is_app_nonfree(target_app)
                    app_is_nonfree = self._is_app_nonfree(app)
                    if target_is_nonfree == app_is_nonfree:
                        license_score = scoring_config.get("license", {}).get(
                            "same_type_score", 2
                        )
                        score += license_score
                        score_breakdown["license"] = license_score

            # 7. Similar popularity tier
            if scoring_config.get("popularity", {}).get("enabled", True):
                if app.stars and target_app.stars:
                    target_tier = self._get_popularity_tier(target_app.stars)
                    app_tier = self._get_popularity_tier(app.stars)
                    if target_tier == app_tier:
                        popularity_score = scoring_config.get("popularity", {}).get(
                            "same_tier_score", 1
                        )
                        score += popularity_score
                        score_breakdown["popularity"] = popularity_score

            # 8. Both have or don't have 3rd party dependencies
            if scoring_config.get("dependencies", {}).get("enabled", True):
                if app.depends_3rdparty == target_app.depends_3rdparty:
                    dep_score = scoring_config.get("dependencies", {}).get(
                        "same_status_score", 1
                    )
                    score += dep_score
                    score_breakdown["dependencies"] = dep_score

            # Only include apps that meet minimum score threshold
            min_score = config.get("min_score", 3)
            if score >= min_score:
                related.append((app, score, score_breakdown))

                if debug:
                    print(f"  {app.name}: {score} points - {score_breakdown}")

        # Sort by score (descending), then by tiebreakers
        tiebreakers = config.get("tiebreakers", ["stars", "name"])

        def sort_key(item):
            app, score, breakdown = item
            key = [-score]  # Negative for descending order

            for tiebreaker in tiebreakers:
                if tiebreaker == "stars":
                    key.append(-(app.stars or 0))
                elif tiebreaker == "name":
                    key.append(app.name.lower())

            return tuple(key)

        related.sort(key=sort_key)

        # Return only the apps, limited by max_results
        max_results = config.get("max_results", 6)
        result_apps = [app for app, score, breakdown in related[:max_results]]

        if debug:
            print(f"  -> Returning {len(result_apps)} related apps")

        return result_apps

    def _calculate_semantic_similarity(
        self, target_app: Application, app: Application
    ) -> int:
        """Calculate semantic similarity using automatic phrase detection and TF-IDF-like scoring."""
        if not target_app.description or not app.description:
            return 0

        # Get significant phrases from both descriptions
        target_phrases = self._extract_significant_phrases(target_app.description)
        app_phrases = self._extract_significant_phrases(app.description)

        # Find common phrases and calculate weighted score
        score = 0
        common_phrases = target_phrases & app_phrases

        for phrase in common_phrases:
            # Calculate phrase weight based on characteristics
            phrase_weight = self._calculate_phrase_weight(phrase)
            score += phrase_weight

        return min(int(score), 25)  # Cap at max_score

    def _calculate_phrase_weight(self, phrase: str) -> float:
        """Calculate the weight of a phrase based purely on its characteristics."""
        import re

        words = phrase.split()
        word_count = len(words)

        # Base weight by word count (multi-word phrases are more significant)
        if word_count == 1:
            weight = 2.0
        elif word_count == 2:
            weight = 4.0
        elif word_count == 3:
            weight = 6.0
        else:  # 4+ words
            weight = 8.0

        # 1. Boost for compound technical terms (words with hyphens or specific patterns)
        if re.search(r"\b\w+[-_]\w+\b", phrase):
            weight *= 1.3

        # 2. Boost for capitalized words (likely proper nouns/brands/technologies)
        original_phrase = phrase  # We need the original case
        if any(word[0].isupper() for word in original_phrase.split() if len(word) > 1):
            weight *= 1.2

        # 3. Slight boost for longer individual words (more specific terms)
        avg_word_length = sum(len(word) for word in words) / len(words)
        if avg_word_length > 6:  # Longer words tend to be more specific
            weight *= 1.1

        # 4. Reduce weight for very common tech buzzwords
        common_buzzwords = [
            "best",
            "new",
            "free",
            "powerful",
            "easy",
            "simple",
            "fast",
            "secure",
            "reliable",
            "free",
            "open-source",
            "self-hosted",
            "lightweight",
            "high-performance",
        ]
        if any(buzz in phrase for buzz in common_buzzwords):
            weight *= 0.9

        # 5. Boost for phrases with numbers (versions, ports, etc.)
        if re.search(r"\b\d+\b", phrase):
            weight *= 1.1

        return weight

    def _extract_significant_phrases(self, description: str) -> set:
        """Extract significant phrases from a description using automatic detection."""
        import re

        if not description:
            return set()

        # Clean and normalize text
        text = description.lower()
        # Remove common punctuation but keep hyphens in compound words
        text = re.sub(r"[^\w\s\-]", " ", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()

        phrases = set()
        words = text.split()

        # Extract phrases of different lengths (1-4 words)
        for length in range(1, 5):  # 1 to 4 words
            for i in range(len(words) - length + 1):
                phrase = " ".join(words[i : i + length])

                # Filter out very common/generic words for single words
                if length == 1 and self._is_generic_word(phrase):
                    continue

                # Filter out phrases that are too generic
                if self._is_significant_phrase(phrase, length):
                    phrases.add(phrase)

        return phrases

    def _is_generic_word(self, word: str) -> bool:
        """Check if a single word is too generic to be meaningful."""
        # Common words that don't indicate similarity
        generic_words = {
            # Articles and prepositions
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "up",
            "about",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "between",
            "among",
            # Common verbs
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            # Pronouns and determiners
            "that",
            "which",
            "who",
            "when",
            "where",
            "why",
            "how",
            "all",
            "any",
            "both",
            "each",
            "few",
            "more",
            "most",
            "other",
            "some",
            "such",
            "only",
            "own",
            "same",
            # Common adverbs and adjectives
            "so",
            "than",
            "too",
            "very",
            "just",
            "now",
            "also",
            "different",
            "small",
            "large",
            "new",
            "old",
            "good",
            "great",
            "first",
            "last",
            "long",
            "little",
            "right",
            "big",
            "high",
            "following",
            "local",
            "sure",
            # Common action words that don't indicate domain
            "using",
            "used",
            "use",
            "like",
            "way",
            "make",
            "get",
            "go",
            "know",
            "take",
            "see",
            "come",
            "think",
            "look",
            "want",
            "give",
            "without",
            "including",
            "provides",
            "allows",
            "supports",
            # Common adverisment words
            "best",
            "new",
            "free",
            "powerful",
            "easy",
            "simple",
            "fast",
            "secure",
            "reliable",
            "free",
            "open-source",
            "self-hosted",
            "community",
            "enterprise",
            "lightweight",
            "high-performance",
        }
        return word in generic_words

    def _is_significant_phrase(self, phrase: str, length: int) -> bool:
        """
        Determine if a phrase is significant enough to consider for similarity.
        """
        import re

        # Single word filtering
        if length == 1:
            return (
                len(phrase) > 3
                and not phrase.isdigit()
                and not self._is_generic_word(phrase)
            )

        # Multi-word filtering
        words = phrase.split()

        # 1. Reject phrases that are mostly generic words
        generic_word_count = sum(1 for word in words if self._is_generic_word(word))
        if generic_word_count > len(words) / 2:
            return False

        # 2. Reject phrases that start with generic connectors/articles
        useless_patterns = [
            r"^(with|and|for|the|a|an)\s",
            r"^(is|are|can|will|has|have)\s",
            r"^(you|your|it|its|this|that)\s",
            r"^(also|using|used|like|such)\s",
        ]

        for pattern in useless_patterns:
            if re.search(pattern, phrase):
                return False

        # 3. Basic quality filter for remaining multi-word phrases
        if length > 1:
            # Reject phrases where all words are very short (likely abbreviations or noise)
            if all(len(word) <= 2 for word in words):
                return False

            # Accept all other multi-word phrases
            # The weighting system will determine their actual importance
            return True

        # Fallback (shouldn't reach here for valid input)
        return False

    def _calculate_alternative_similarity(
        self, target_app: Application, app: Application, scoring_config: Dict
    ) -> int:
        """Calculate similarity based on alternative-to relationships."""
        alt_config = scoring_config.get("alternatives", {})
        if not alt_config.get("enabled", True):
            return 0

        score = 0

        # If both apps mention being alternatives to the same software
        if (
            hasattr(target_app, "alternative_to")
            and hasattr(app, "alternative_to")
            and target_app.alternative_to
            and app.alternative_to
        ):

            target_alts = set(alt.lower().strip() for alt in target_app.alternative_to)
            app_alts = set(alt.lower().strip() for alt in app.alternative_to)

            common_alternatives = target_alts & app_alts
            points_per_match = alt_config.get("points_per_match", 6)
            score += len(common_alternatives) * points_per_match

        return score

    def _calculate_fork_similarity(
        self, target_app: Application, app: Application, scoring_config: Dict
    ) -> int:
        """Calculate similarity based on fork relationships."""
        fork_config = scoring_config.get("forks", {})
        if not fork_config.get("enabled", True):
            return 0

        score = 0

        # If both are forks of the same project
        if (
            hasattr(target_app, "fork_of")
            and hasattr(app, "fork_of")
            and target_app.fork_of
            and app.fork_of
        ):

            if target_app.fork_of.lower().strip() == app.fork_of.lower().strip():
                same_parent_score = fork_config.get("same_parent_score", 8)
                score += same_parent_score

        return score

    def _is_app_nonfree(self, app: Application) -> bool:
        """Check if an application uses non-free licenses."""
        if not app.license:
            return False

        # Get non-free license identifiers from loaded license data
        if hasattr(self, "licenses_data") and self.licenses_data:
            nonfree_licenses = {
                lic_id
                for lic_id, lic_info in self.licenses_data.items()
                if not lic_info.get("free", True)
            }
            return any(lic in nonfree_licenses for lic in app.license)

        # Fallback to basic check if license data not available
        return any(lic in ["⊘ Proprietary"] for lic in app.license)

    def _get_popularity_tier(self, stars: int) -> str:
        """Categorize applications by popularity tier based on star count."""
        if stars >= 10000:
            return "mega"  # 10k+ stars
        elif stars >= 5000:
            return "highly"  # 5k-10k stars
        elif stars >= 1000:
            return "popular"  # 1k-5k stars
        elif stars >= 100:
            return "moderate"  # 100-1k stars
        else:
            return "emerging"  # <100 stars

    def _generate_search_data(self, applications: List[Application]) -> Dict[str, Any]:
        """Generate search data for client-side search."""
        search_data = []

        for app in applications:
            search_entry = {
                "id": app.id,
                "name": app.name,
                "description": app.description,
                "url": app.url,
                "repo_url": app.repo_url,
                "demo_url": app.demo_url,
                "categories": app.categories,
                "license": app.license,
                "platforms": app.platforms,
                "stars": app.stars or 0,
                "last_updated": app.last_updated,
                "depends_3rdparty": app.depends_3rdparty,
                "current_release": app.current_release,
                "commit_history": app.commit_history,
                "is_nonfree": self._is_app_nonfree(app),
                "documentation_language": app.documentation_language,
                "fork_of": app.fork_of,
                "fork_url": app.fork_url,
            }
            search_data.append(search_entry)

        # Get non-free license identifiers for frontend
        nonfree_licenses = []
        if hasattr(self, "licenses_data") and self.licenses_data:
            nonfree_licenses = [
                lic_id
                for lic_id, lic_info in self.licenses_data.items()
                if not lic_info.get("free", True)
            ]

        return {
            "apps": search_data,
            "total": len(search_data),
            "nonfree_licenses": nonfree_licenses,
        }

    def _generate_search_data_file(self, search_data: Dict[str, Any]):
        """Generate search data JSON file for client-side search."""
        search_file = self.config.output_dir / "static" / "data" / "search.json"
        search_file.parent.mkdir(exist_ok=True)

        with open(search_file, "w", encoding="utf-8") as f:
            json.dump(search_data, f, separators=(",", ":"))

        print("Search data file generated")

    def _generate_alternatives_data_file(self, applications: List[Application]) -> Dict[str, Any]:
        """Generate alternatives data JSON file for client-side alternatives page."""
        from .data_processor import DataProcessor
        from dataclasses import asdict
        
        processor = DataProcessor(self.config)
        alternatives_data = processor.generate_alternatives_data(applications)
        
        # Apply minimum alternatives filter
        min_alternatives = self.config.get("alternatives.min_alternatives", 2)
        filtered_alternatives = {
            name: [asdict(app) for app in apps]
            for name, apps in alternatives_data['alternatives'].items()
            if len(apps) >= min_alternatives
        }
        
        # Create the data structure for the JSON file
        json_data = {
            "alternatives": filtered_alternatives,
            "statistics": alternatives_data['statistics'],
            "total_software": len(filtered_alternatives),
            "total_alternatives": sum(len(apps) for apps in filtered_alternatives.values()),
            "config": self.config.get("alternatives", {})
        }
        
        # Write to file
        alternatives_file = self.config.output_dir / "static" / "data" / "alternatives.json"
        alternatives_file.parent.mkdir(exist_ok=True)
        
        with open(alternatives_file, "w", encoding="utf-8") as f:
            json.dump(json_data, f, separators=(",", ":"))
        
        return json_data

    def _generate_sitemap(self, applications: List[Application]):
        """Generate XML sitemap."""
        template = self.jinja_env.get_template("sitemap.xml")
        base_path = self.config.get('site.base_path', '').rstrip('/')

        urls = [
            {"loc": base_path + "/", "priority": "1.0"},  # Homepage
            {"loc": base_path + "/browse.html", "priority": "1.0"},  # Browse page
            {"loc": base_path + "/statistics.html", "priority": "1.0"},  # Statistics page
        ]

        # Add alternatives page if enabled
        if self.config.get("alternatives.enabled", False):
            urls.append({"loc": base_path + "/alternatives.html", "priority": "0.9"})

        # Add application pages
        for app in applications:
            urls.append({"loc": base_path + f"/apps/{app.id}.html", "priority": "0.7"})

        content = template.render(
            urls=urls,
            site_url=self.config.get("site.url", "https://awesome-selfhosted.net") + base_path,
        )

        output_path = self.config.output_dir / "sitemap.xml"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        print("Sitemap generated")

    def _generate_robots_txt(self):
        """Generate robots.txt file."""
        robots_config = self.config.get("robots", {})
        base_path = self.config.get('site.base_path', '').rstrip('/')

        # Skip generation if not enabled
        if not robots_config.get("generate", True):
            return

        # Default robots.txt content
        content = []

        # User-agent
        user_agent = robots_config.get("user_agent", "*")
        content.append(f"User-agent: {user_agent}")

        # Allow directives
        allow_paths = robots_config.get("allow", ["/"])
        for path in allow_paths:
            content.append(f"Allow: {path}")

        # Disallow directives
        disallow_paths = robots_config.get("disallow", ["/static/data/"])
        for path in disallow_paths:
            content.append(f"Disallow: {path}")

        # Sitemap URL
        site_url = self.config.get("site.url", "")
        sitemap_path = robots_config.get("sitemap_url", "/sitemap.xml")
        if site_url:
            content.append(f"\nSitemap: {site_url}{base_path}{sitemap_path}")

        # Write robots.txt
        robots_path = self.config.output_dir / "robots.txt"
        with open(robots_path, "w", encoding="utf-8") as f:
            f.write("\n".join(content))

        print("Robots.txt generated")

    def _minify_html_if_enabled(self, html_content: str) -> str:
        """Minify HTML content if enabled in configuration."""
        if self.config.get("generation.minify_html", False):
            if MINIFY_AVAILABLE:
                try:
                    return minify(html_content, minify_js=True, minify_css=True)
                except Exception as e:
                    print(f"Warning: HTML minification failed: {e}")
                    return html_content
            else:
                print(
                    "Warning: HTML minification enabled but minify-html library not available"
                )
                return html_content
        return html_content
