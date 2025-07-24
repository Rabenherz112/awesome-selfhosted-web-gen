"""
Utility functions for the site generator.
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, Any, Optional
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
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
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def read_json(file_path: Path) -> Optional[Dict[str, Any]]:
    """Read JSON file."""
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def format_bytes(bytes_count: int) -> str:
    """Format bytes count for human-readable display."""
    for unit in ['B', 'KB', 'MB', 'GB']:
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
    
    for file_path in directory.rglob('*'):
        if file_path.is_file():
            total_size += file_path.stat().st_size
    
    return total_size


class DevServer:
    """Simple development server for testing the generated site."""
    
    def __init__(self, directory: Path, port: int = 8000):
        """Initialize development server."""
        self.directory = directory.resolve()
        self.port = port
        self.server = None
        self.thread = None
    
    def start(self) -> None:
        """Start the development server."""
        if self.server:
            print("Server is already running")
            return
        
        if not self.directory.exists():
            print(f"Directory not found: {self.directory}")
            return
        
        # Change to the output directory
        original_cwd = os.getcwd()
        os.chdir(self.directory)
        
        try:
            self.server = HTTPServer(('localhost', self.port), SimpleHTTPRequestHandler)
            self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            
            print(f"Development server started at http://localhost:{self.port}")
            print(f"Serving directory: {self.directory}")
            print("Press Ctrl+C to stop the server")
            
        except OSError as e:
            print(f"Failed to start server on port {self.port}: {e}")
            os.chdir(original_cwd)
            raise
        finally:
            # Always change back to original directory
            if os.getcwd() != original_cwd:
                os.chdir(original_cwd)
    
    def stop(self) -> None:
        """Stop the development server."""
        if self.server:
            self.server.shutdown()
            self.server = None
            print("Development server stopped")
    
    def is_running(self) -> bool:
        """Check if server is running."""
        return self.server is not None


def validate_url(url: str) -> bool:
    """Validate if string is a valid URL."""
    import re
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(url) is not None


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe file system usage."""
    import re
    # Remove or replace unsafe characters
    filename = re.sub(r'[<>:"/\\|?*]', '-', filename)
    filename = re.sub(r'[-\s]+', '-', filename)  # Multiple hyphens/spaces to single hyphen
    return filename.strip('-')


def get_project_root() -> Path:
    """Get project root directory."""
    current = Path(__file__).parent
    while current.parent != current:
        if (current / 'config.yaml').exists():
            return current
        current = current.parent
    return Path.cwd()


def print_build_stats(output_dir: Path) -> None:
    """Print build statistics."""
    if not output_dir.exists():
        print("Output directory not found")
        return
    
    stats = {}
    
    # Count files by type
    for file_path in output_dir.rglob('*'):
        if file_path.is_file():
            ext = file_path.suffix.lower()
            stats[ext] = stats.get(ext, 0) + 1
    
    total_size = get_directory_size(output_dir)
    total_files = sum(stats.values())
    
    print(f"\n📊 Build Statistics:")
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
        print(f"⏱️  {func.__name__} completed in {execution_time:.2f} seconds")
        return result
    return wrapper


class ProgressBar:
    """Simple progress bar for console output."""
    
    def __init__(self, total: int, description: str = "Processing"):
        """Initialize progress bar."""
        self.total = total
        self.current = 0
        self.description = description
        self.start_time = time.time()
    
    def update(self, amount: int = 1, description: str = None) -> None:
        """Update progress bar."""
        self.current += amount
        if description:
            self.description = description
        
        self._display()
    
    def _display(self) -> None:
        """Display progress bar."""
        if self.total == 0:
            return
        
        percentage = (self.current / self.total) * 100
        bar_length = 50
        filled_length = int(bar_length * self.current // self.total)
        
        bar = '█' * filled_length + '-' * (bar_length - filled_length)
        
        elapsed_time = time.time() - self.start_time
        if self.current > 0:
            eta = (elapsed_time / self.current) * (self.total - self.current)
            eta_str = f"ETA: {eta:.1f}s"
        else:
            eta_str = "ETA: --"
        
        print(f'\r{self.description}: |{bar}| {percentage:.1f}% ({self.current}/{self.total}) {eta_str}', end='')
        
        if self.current >= self.total:
            print()  # New line when complete
    
    def finish(self) -> None:
        """Mark progress as complete."""
        self.current = self.total
        self._display() 