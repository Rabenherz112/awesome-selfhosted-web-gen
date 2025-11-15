"""
Utility functions for the site generator.
"""

import shutil
import json
from pathlib import Path
from typing import Dict, Any, Optional
import time


def ensure_directory(path: Path) -> None:
    """Ensure directory exists, create if not."""
    path.mkdir(parents=True, exist_ok=True)


def clean_directory(path: Path) -> None:
    """Clean directory contents."""
    if path.exists() and path.is_dir():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_file(src: Path, dst: Path) -> None:
    """Copy file from source to destination."""
    ensure_directory(dst.parent)
    shutil.copy2(src, dst)


def write_json(data: Any, file_path: Path) -> None:
    """Write data to JSON file."""
    ensure_directory(file_path.parent)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_json(file_path: Path) -> Optional[Dict[str, Any]]:
    """Read JSON file."""
    if not file_path.exists():
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def format_bytes(bytes_count: int) -> str:
    """Format bytes count for human-readable display."""
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_count < 1024.0:
            return f"{bytes_count:.1f} {unit}"
        bytes_count /= 1024.0
    return f"{bytes_count:.1f} TB"


def get_file_size(file_path: Path) -> int:
    """Get file size in bytes."""
    return file_path.stat().st_size if file_path.exists() else 0


def get_directory_size(directory: Path) -> int:
    """Get total size of directory in bytes."""
    total_size = 0

    if not directory.exists():
        return 0

    for file_path in directory.rglob("*"):
        if file_path.is_file():
            total_size += file_path.stat().st_size

    return total_size


def print_build_stats(output_dir: Path) -> None:
    """Print build statistics."""
    if not output_dir.exists():
        print("Output directory not found")
        return

    stats = {}

    # Count files by type
    for file_path in output_dir.rglob("*"):
        if file_path.is_file():
            ext = file_path.suffix.lower()
            stats[ext] = stats.get(ext, 0) + 1

    total_size = get_directory_size(output_dir)
    total_files = sum(stats.values())

    print(f"\nBuild Statistics:")
    print(f"   Total files: {total_files}")
    print(f"   Total size: {format_bytes(total_size)}")
    print(f"   Output directory: {output_dir}")

    if stats:
        print(f"\n   File types:")
        for ext, count in sorted(stats.items()):
            ext_display = ext if ext else "no extension"
            print(f"     {ext_display}: {count}")


def timer_decorator(func):
    """Decorator to time function execution."""

    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        print(f"{func.__name__} completed in {execution_time:.2f} seconds")
        return result

    return wrapper
