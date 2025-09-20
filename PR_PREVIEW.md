# PR Preview System

This repository includes an automated PR preview system that helps validate changes before they are merged.

## Setup Requirements

To enable this system, repository administrators need to:

1. **Enable GitHub Pages**: Go to Settings > Pages and set source to "Deploy from a branch" and select "gh-pages"
2. **Configure Workflow Permissions**: Go to Settings > Actions > General > Workflow permissions and enable "Read and write permissions"

## How it works

When you create or update a pull request:

1. **Automatic Build**: The PR preview workflow automatically runs using the code from your PR
2. **Data Processing**: It fetches the latest awesome-selfhosted-data and runs the generator
3. **Fast Preview**: Uses optimized configuration (`config-pr-preview.yml`) for faster builds
4. **Deployment**: The generated website is deployed to a unique URL at `https://[owner].github.io/[repo]/pr-[number]/`
5. **PR Comment**: A bot automatically posts a comment in your PR with the preview link

## Benefits

- **Validation**: Ensures your changes don't break the generator
- **Visual Review**: Immediately see how your changes affect the generated website
- **Fast Feedback**: Get results without having to run the generator locally

## Configuration

The PR preview system uses `config-pr-preview.yml` which:

- Disables semantic similarity processing for faster builds
- Uses the same templates and styling as the main site
- Includes all core functionality for testing

## Cleanup

When a PR is closed or merged, the preview is automatically removed to save space.

## Preview Index

All active PR previews are listed at: `https://[owner].github.io/[repo]/`

## Technical Details

- **Workflow**: `.github/workflows/pr-preview.yml`
- **Configuration**: `config-pr-preview.yml`
- **Deployment**: GitHub Pages (gh-pages branch)
- **Trigger**: `pull_request` events (opened, synchronize, reopened, closed)
