#!/usr/bin/env python3
"""
Awesome Self-Hosted Website Generator

Command-line interface for generating a static website from awesome-selfhosted data.
"""

import sys
import time
import click
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.config import Config
from src.data_processor import DataProcessor
from src.site_generator import SiteGenerator
from src.utils import DevServer, print_build_stats, timer_decorator


@click.group()
@click.option('--config', '-c', default='config.yaml', help='Configuration file path')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
@click.pass_context
def cli(ctx, config, verbose):
    """Awesome Self-Hosted Website Generator
    
    Generate a beautiful static website from the awesome-selfhosted dataset.
    """
    # Ensure context object exists
    ctx.ensure_object(dict)
    
    try:
        ctx.obj['config'] = Config(config)
        ctx.obj['verbose'] = verbose
        
        if verbose:
            click.echo(f"Using configuration: {config}")
            
    except FileNotFoundError as e:
        click.echo(f"Error: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.pass_context
def fetch(ctx):
    """Fetch and process awesome-selfhosted data."""
    config = ctx.obj['config']
    
    click.echo("🌐 Fetching awesome-selfhosted data...")
    
    try:
        processor = DataProcessor(config)
        
        # Fetch raw data
        with click.progressbar(length=4, label='Fetching data files') as bar:
            raw_data = processor.fetch_awesome_data()
            bar.update(4)
        
        # Process applications
        click.echo("📊 Processing application data...")
        applications = processor.process_applications(raw_data['apps'])
        
        click.echo(f"✅ Processed {len(applications)} applications")
        
        # Generate additional data structures
        categories = processor.create_category_hierarchy(applications, raw_data['categories'])
        statistics = processor.generate_statistics(applications, categories, raw_data['tags'])
        
        click.echo(f"📈 Statistics: {statistics['total_apps']} apps, {statistics['categories_count']} categories")
        
        # Cache processed data
        cache_file = config.data_cache_dir / 'processed_data.json'
        
        # Ensure cache directory exists
        config.data_cache_dir.mkdir(parents=True, exist_ok=True)
        
        import json
        from dataclasses import asdict
        
        processed_data = {
            'applications': [asdict(app) for app in applications],
            'categories': categories,
            'tags': raw_data['tags'],
            'licenses': raw_data['licenses'],
            'statistics': statistics,
            'processed_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, indent=2, ensure_ascii=False)
        
        click.echo(f"💾 Cached processed data to {cache_file}")
        
    except Exception as e:
        click.echo(f"❌ Error fetching data: {e}", err=True)
        if ctx.obj['verbose']:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.option('--fetch-first', is_flag=True, help='Fetch fresh data before building')
@click.pass_context
def build(ctx, fetch_first):
    """Build the complete static website."""
    config = ctx.obj['config']
    
    click.echo("🏗️ Building awesome-selfhosted website...")
    
    try:
        # Fetch data if requested
        if fetch_first:
            ctx.invoke(fetch)
        
        # Load processed data
        cache_file = config.data_cache_dir / 'processed_data.json'
        
        if not cache_file.exists():
            click.echo("⚠️ No cached data found. Running fetch first...")
            ctx.invoke(fetch)
        
        # Load the data
        import json
        with open(cache_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Convert back to Application objects
        from src.data_processor import Application
        applications = [Application(**app_data) for app_data in data['applications']]
        categories = data['categories']
        tags = data['tags']
        statistics = data['statistics']
        
        click.echo(f"📚 Loaded {len(applications)} applications from cache")
        
        # Generate the site
        generator = SiteGenerator(config)
        
        with click.progressbar(length=5, label='Generating site') as bar:
            generator.generate_site(applications, categories, tags, statistics, data.get('licenses', {}))
            bar.update(5)
        
        # Print build statistics
        print_build_stats(config.output_dir)
        
        click.echo(f"✅ Website generated successfully!")
        click.echo(f"📁 Output directory: {config.output_dir}")
        
    except Exception as e:
        click.echo(f"❌ Error building site: {e}", err=True)
        if ctx.obj['verbose']:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.option('--port', '-p', default=8000, help='Port to serve on')
@click.option('--build-first', is_flag=True, help='Build the site before serving')
@click.pass_context
def serve(ctx, port, build_first):
    """Start a local development server."""
    config = ctx.obj['config']
    
    if build_first:
        ctx.invoke(build)
    
    if not config.output_dir.exists():
        click.echo("❌ Output directory not found. Run 'generate.py build' first.")
        sys.exit(1)
    
    try:
        server = DevServer(config.output_dir, port)
        server.start()
        
        # Keep the server running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            server.stop()
            click.echo("\n👋 Server stopped")
            
    except Exception as e:
        click.echo(f"❌ Error starting server: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option('--interval', '-i', default=5, help='Watch interval in seconds')
@click.pass_context
def watch(ctx, interval):
    """Watch for changes and rebuild automatically."""
    config = ctx.obj['config']
    
    click.echo(f"👀 Watching for changes (checking every {interval}s)...")
    click.echo("Press Ctrl+C to stop")
    
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
                click.echo(f"\n🔄 Changes detected in {len(changed_files)} files")
                for file_path in changed_files[:3]:  # Show first 3
                    click.echo(f"   • {Path(file_path).name}")
                if len(changed_files) > 3:
                    click.echo(f"   • ... and {len(changed_files) - 3} more")
                
                # Rebuild the site
                ctx.invoke(build)
                last_times = current_times
                click.echo("✅ Rebuild complete. Watching for more changes...")
                
    except KeyboardInterrupt:
        click.echo("\n👋 Watch stopped")


@cli.command()
@click.pass_context
def clean(ctx):
    """Clean output and cache directories."""
    config = ctx.obj['config']
    
    click.echo("🧹 Cleaning directories...")
    
    # Clean output directory
    if config.output_dir.exists():
        import shutil
        shutil.rmtree(config.output_dir)
        click.echo(f"   • Removed {config.output_dir}")
    
    # Clean cache directory
    if config.data_cache_dir.exists():
        import shutil
        shutil.rmtree(config.data_cache_dir)
        click.echo(f"   • Removed {config.data_cache_dir}")
    
    click.echo("✅ Cleanup complete")


@cli.command()
@click.pass_context
def info(ctx):
    """Show configuration and system information."""
    config = ctx.obj['config']
    
    click.echo("ℹ️  Configuration Information:")
    click.echo(f"   Config file: {config.config_path}")
    click.echo(f"   Template directory: {config.template_dir}")
    click.echo(f"   Static directory: {config.static_dir}")
    click.echo(f"   Output directory: {config.output_dir}")
    click.echo(f"   Data cache directory: {config.data_cache_dir}")
    
    site_config = config.get_site_config()
    click.echo(f"\n🌐 Site Configuration:")
    click.echo(f"   Title: {site_config.get('title', 'N/A')}")
    click.echo(f"   Description: {site_config.get('description', 'N/A')}")
    click.echo(f"   URL: {site_config.get('url', 'N/A')}")
    
    # Check if directories exist
    click.echo(f"\n📁 Directory Status:")
    directories = [
        ('Templates', config.template_dir),
        ('Static files', config.static_dir),
        ('Output', config.output_dir),
        ('Data cache', config.data_cache_dir),
    ]
    
    for name, path in directories:
        status = "✅ Exists" if path.exists() else "❌ Missing"
        click.echo(f"   {name}: {status} ({path})")
    
    # Check cached data
    cache_file = config.data_cache_dir / 'processed_data.json'
    if cache_file.exists():
        import json
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            click.echo(f"\n💾 Cached Data:")
            click.echo(f"   Applications: {len(data.get('applications', []))}")
            click.echo(f"   Categories: {len(data.get('categories', {}))}")
            click.echo(f"   Processed at: {data.get('processed_at', 'Unknown')}")
        except:
            click.echo(f"\n💾 Cached Data: ❌ Corrupted")
    else:
        click.echo(f"\n💾 Cached Data: ❌ Not found")


if __name__ == '__main__':
    cli() 