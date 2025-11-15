"""
Configuration management for the site generator.
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any


class Config:
    """Configuration management class."""

    def __init__(self, config_path: str = "config/config.yml"):
        """Initialize configuration from YAML file."""
        self.config_path = Path(config_path)
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if not self.config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")

        with open(self.config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation (e.g., 'site.title')."""
        keys = key.split(".")
        value = self._config

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default

        return value

    def get_site_config(self) -> Dict[str, Any]:
        """Get site-specific configuration."""
        return self._config.get("site", {})

    def get_data_config(self) -> Dict[str, Any]:
        """Get data source configuration."""
        return self._config.get("data", {})

    def get_build_config(self) -> Dict[str, Any]:
        """Get build configuration."""
        return self._config.get("build", {})

    def get_generation_config(self) -> Dict[str, Any]:
        """Get generation options."""
        return self._config.get("generation", {})

    def get_search_config(self) -> Dict[str, Any]:
        """Get search configuration."""
        return self._config.get("search", {})

    def get_performance_config(self) -> Dict[str, Any]:
        """Get performance configuration."""
        return self._config.get("performance", {})

    def get_alternatives_config(self) -> Dict[str, Any]:
        """Get alternatives configuration."""
        return self._config.get("alternatives", {})

    @property
    def output_dir(self) -> Path:
        """Get output directory path."""
        return Path(self.get("build.output_dir", "output"))

    @property
    def template_dir(self) -> Path:
        """Get template directory path."""
        template_path = Path(self.get("build.template_dir", "templates"))
        # If local template directory exists, use it; otherwise try package data
        if template_path.exists():
            return template_path
        # Try to find templates in package data
        try:
            import importlib.resources
            # Use files() API for Python 3.9+
            template_ref = importlib.resources.files("aswg") / "templates"
            # Convert Traversable to string path (works for both files and dirs)
            return Path(str(template_ref))
        except (ImportError, ModuleNotFoundError, (AttributeError, TypeError)):
            pass
        return template_path

    @property
    def static_dir(self) -> Path:
        """Get static files directory path."""
        static_path = Path(self.get("build.static_dir", "static"))
        # If local static directory exists, use it; otherwise try package data
        if static_path.exists():
            return static_path
        # Try to find static files in package data
        try:
            import importlib.resources
            # Use files() API for Python 3.9+
            static_ref = importlib.resources.files("aswg") / "static"
            # Convert Traversable to string path (works for both files and dirs)
            return Path(str(static_ref))
        except (ImportError, ModuleNotFoundError, (AttributeError, TypeError)):
            pass
        return static_path

    @property
    def data_cache_dir(self) -> Path:
        """Get data cache directory path."""
        return Path(self.get("build.data_cache_dir", "data"))

    def ensure_directories(self):
        """Ensure all required directories exist."""
        dirs = [self.output_dir, self.data_cache_dir, self.output_dir / "static"]

        for directory in dirs:
            directory.mkdir(parents=True, exist_ok=True)
