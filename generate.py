#!/usr/bin/env python3
"""
Awesome Self-Hosted Website Generator

Command-line interface for generating a static website from awesome-selfhosted data.
"""

import sys
import time
import argparse
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.config import Config
from src.data_processor import DataProcessor
from src.site_generator import SiteGenerator
from src.utils import print_build_stats, timer_decorator


def create_parser():
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        description='Awesome Self-Hosted Website Generator - Generate a beautiful static website from the awesome-selfhosted dataset.'
    )
    
    parser.add_argument('--config', '-c', 
                       default='config.yaml', 
                       help='Configuration file path (default: config.yaml)')
    parser.add_argument('--verbose', '-v', 
                       action='store_true', 
                       help='Enable verbose output')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Fetch command
    fetch_parser = subparsers.add_parser('fetch', help='Fetch and process awesome-selfhosted data')
    
    # Build command
    build_parser = subparsers.add_parser('build', help='Build the complete static website')
    build_parser.add_argument('--fetch-first', action='store_true',
                             help='Fetch fresh data before building')
    
    # Watch command
    watch_parser = subparsers.add_parser('watch', help='Watch for changes and rebuild automatically')
    watch_parser.add_argument('--interval', '-i', type=int, default=5,
                             help='Watch interval in seconds (default: 5)')
    
    # Clean command
    clean_parser = subparsers.add_parser('clean', help='Clean output and cache directories')
    
    # Info command
    info_parser = subparsers.add_parser('info', help='Show configuration and system information')
    
    return parser


def load_config(config_path, verbose=False):
    """Load configuration and handle errors."""
    try:
        config = Config(config_path)
        if verbose:
            print(f"Using configuration: {config_path}")
        return config
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_fetch(config, verbose=False):
    """Fetch and process awesome-selfhosted data."""
    print("🌐 Fetching awesome-selfhosted data...")
    
    try:
        processor = DataProcessor(config)
        
        # Fetch raw data
        print("Fetching data files...")
        raw_data = processor.fetch_awesome_data()
        
        # Process applications
        print("📊 Processing application data...")
        applications = processor.process_applications(raw_data['apps'])
        
        print(f"✅ Processed {len(applications)} applications")
        
        # Generate additional data structures
        categories = processor.create_category_hierarchy(applications, raw_data['categories'])
        statistics = processor.generate_statistics(applications, categories)
        
        print(f"📈 Statistics: {statistics['total_apps']} apps, {statistics['categories_count']} categories")
        
        # Cache processed data
        cache_file = config.data_cache_dir / 'processed_data.json'
        
        # Ensure cache directory exists
        config.data_cache_dir.mkdir(parents=True, exist_ok=True)
        
        import json
        from dataclasses import asdict
        
        processed_data = {
            'applications': [asdict(app) for app in applications],
            'categories': categories,

            'licenses': raw_data['licenses'],
            'statistics': statistics,
            'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Cached processed data to {cache_file}")
        
    except Exception as e:
        print(f"❌ Error fetching data: {e}", file=sys.stderr)
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def cmd_build(config, fetch_first=False, verbose=False):
    """Build the complete static website."""
    print("🏗️ Building awesome-selfhosted website...")
    
    try:
        # Fetch data if requested
        if fetch_first:
            cmd_fetch(config, verbose)
        
        # Load processed data
        cache_file = config.data_cache_dir / 'processed_data.json'
        
        if not cache_file.exists():
            print("⚠️ No cached data found. Running fetch first...")
            cmd_fetch(config, verbose)
        
        # Load the data
        import json
        with open(cache_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Convert back to Application objects
        from src.data_processor import Application
        applications = [Application(**app_data) for app_data in data['applications']]
        categories = data['categories']

        statistics = data['statistics']
        
        print(f"📚 Loaded {len(applications)} applications from cache")
        
        # Generate the site
        generator = SiteGenerator(config)
        
        print("Generating site...")
        generator.generate_site(applications, categories, statistics, data.get('licenses', {}))
        
        # Print build statistics
        print_build_stats(config.output_dir)
        
        print(f"✅ Website generated successfully!")
        print(f"📁 Output directory: {config.output_dir}")
        
    except Exception as e:
        print(f"❌ Error building site: {e}", file=sys.stderr)
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def cmd_watch(config, interval=5, verbose=False):
    """Watch for changes and rebuild automatically."""
    print(f"👀 Watching for changes (checking every {interval}s)...")
    print("Press Ctrl+C to stop")
    
    # Get initial modification times
    watch_files = [
        config.config_path,
        config.template_dir,
        config.static_dir,
    ]
    
    def get_modification_times():
        times = {}
        for path in watch_files:
            if path.exists():
                if path.is_file():
                    times[str(path)] = path.stat().st_mtime
                else:
                    # Directory - check all files
                    for file_path in path.rglob('*'):
                        if file_path.is_file():
                            times[str(file_path)] = file_path.stat().st_mtime
        return times
    
    last_times = get_modification_times()
    
    try:
        while True:
            time.sleep(interval)
            current_times = get_modification_times()
            
            # Check for changes
            changed_files = []
            for file_path, mod_time in current_times.items():
                if file_path not in last_times or last_times[file_path] != mod_time:
                    changed_files.append(file_path)
            
            if changed_files:
                print(f"\n🔄 Changes detected in {len(changed_files)} files")
                for file_path in changed_files[:3]:  # Show first 3
                    print(f"   • {Path(file_path).name}")
                if len(changed_files) > 3:
                    print(f"   • ... and {len(changed_files) - 3} more")
                
                # Rebuild the site
                cmd_build(config, verbose=verbose)
                last_times = current_times
                print("✅ Rebuild complete. Watching for more changes...")
                
    except KeyboardInterrupt:
        print("\n👋 Watch stopped")


def cmd_clean(config):
    """Clean output and cache directories."""
    print("🧹 Cleaning directories...")
    
    # Clean output directory
    if config.output_dir.exists():
        import shutil
        shutil.rmtree(config.output_dir)
        print(f"   • Removed {config.output_dir}")
    
    # Clean cache directory
    if config.data_cache_dir.exists():
        import shutil
        shutil.rmtree(config.data_cache_dir)
        print(f"   • Removed {config.data_cache_dir}")
    
    print("✅ Cleanup complete")


def cmd_info(config):
    """Show configuration and system information."""
    print("ℹ️  Configuration Information:")
    print(f"   Config file: {config.config_path}")
    print(f"   Template directory: {config.template_dir}")
    print(f"   Static directory: {config.static_dir}")
    print(f"   Output directory: {config.output_dir}")
    print(f"   Data cache directory: {config.data_cache_dir}")
    
    site_config = config.get_site_config()
    print(f"\n🌐 Site Configuration:")
    print(f"   Title: {site_config.get('title', 'N/A')}")
    print(f"   Description: {site_config.get('description', 'N/A')}")
    print(f"   URL: {site_config.get('url', 'N/A')}")
    
    # Check if directories exist
    print(f"\n📁 Directory Status:")
    directories = [
        ('Templates', config.template_dir),
        ('Static files', config.static_dir),
        ('Output', config.output_dir),
        ('Data cache', config.data_cache_dir),
    ]
    
    for name, path in directories:
        status = "✅ Exists" if path.exists() else "❌ Missing"
        print(f"   {name}: {status} ({path})")
    
    # Check cached data
    cache_file = config.data_cache_dir / 'processed_data.json'
    if cache_file.exists():
        import json
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"\n💾 Cached Data:")
            print(f"   Applications: {len(data.get('applications', []))}")
            print(f"   Categories: {len(data.get('categories', {}))}")
            print(f"   Processed at: {data.get('processed_at', 'Unknown')}")
        except:
            print(f"\n💾 Cached Data: ❌ Corrupted")
    else:
        print(f"\n💾 Cached Data: ❌ Not found")


def main():
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Load configuration
    config = load_config(args.config, args.verbose)
    
    # Execute command
    if args.command == 'fetch':
        cmd_fetch(config, args.verbose)
    
    elif args.command == 'build':
        cmd_build(config, args.fetch_first, args.verbose)
    
    elif args.command == 'watch':
        cmd_watch(config, args.interval, args.verbose)
    
    elif args.command == 'clean':
        cmd_clean(config)
    
    elif args.command == 'info':
        cmd_info(config)


if __name__ == '__main__':
    main() 