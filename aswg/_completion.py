"""
Tab completion support for aswg CLI.
"""

import argparse
from pathlib import Path


def complete_commands(prefix, parsed_args, **kwargs):
    """Complete command names."""
    commands = ['fetch', 'build', 'watch', 'clean', 'info']
    return [cmd for cmd in commands if cmd.startswith(prefix)]


def complete_config_files(prefix, parsed_args, **kwargs):
    """Complete config file paths."""
    if not prefix:
        prefix = '.'
    
    path = Path(prefix)
    if path.is_dir():
        # Return YAML files in directory
        try:
            return [str(f) for f in path.glob('*.yml') + path.glob('*.yaml')]
        except:
            return []
    elif path.parent.exists():
        # Return matching files in parent directory
        try:
            return [str(f) for f in path.parent.glob(f'{path.name}*.yml') + 
                    path.parent.glob(f'{path.name}*.yaml')]
        except:
            return []
    return []

