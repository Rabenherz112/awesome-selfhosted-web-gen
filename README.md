# Awesome Selfhosted Website Generator (ASWG)

A Python-based static site generator that creates a beautiful, interactive website from the [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) dataset.

## ✨ Features

- **📊 Data-Driven**: Automatically processes data from awesome-selfhosted-data repository (or any other repository with the same structure)
- **🎨 Modern UI**: Responsive design with dark/light themes and enhanced filters
- **🔍 Powerful Search**: Fuzzy search with mobile support
- **⚡ Static & Fast**: Pre-compiled HTML for fast loading
- **⚙️ Highly Configurable**: Configuration options for UI, navigation, and content
- **📈 Enhanced Analytics**: Line chart commit graphs with smart data requirements
- **🏷️ Smart Licensing**: Automatic non-free license detection using upstream data
- **🔍 Smart Description Parsing**: Extracts relevant information from the description of the application
- **🔍 Alternatives**: Optionally generate an alternatives page with smart grouping of applications

## 📷 Screenshots

![Homepage](https://assets.theravenhub.com/github/aswg/aswg-homepage.png)
![Browse](https://assets.theravenhub.com/github/aswg/aswg-browse.png)
![App Detail](https://assets.theravenhub.com/github/aswg/aswg-app-page.png)
![Alternatives](https://assets.theravenhub.com/github/aswg/aswg-alternative-software.png)
![Statistics](https://assets.theravenhub.com/github/aswg/aswg-statistics.png)

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- pip package manager
- Cloned [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) repository

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Rabenherz112/awesome-selfhosted-web-gen.git
cd awesome-selfhosted-generator
```

2. **Clone the data repository:**
```bash
git clone https://github.com/awesome-selfhosted/awesome-selfhosted-data/
```

3. **Create a virtual environment:**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate.ps1
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Generate the website:**
```bash
python generate.py build
```

6. **View your website:**
   Open the `output/index.html` file in your browser to see your generated website!

## 📋 CLI Commands

### Main Commands

```bash
# Fetch and process data
python generate.py fetch

# Build the complete website
python generate.py build

# Watch for changes and rebuild automatically
python generate.py watch

# Clean output and cache directories
python generate.py clean

# Show configuration info
python generate.py info
```

### Command Options

```bash
# Build with fresh data
python generate.py build --fetch-first

# Watch with custom interval
python generate.py watch --interval 3

# Use custom config file
python generate.py --config custom-config.yaml build
```

### CSS Development

When making changes to the website's styling (modifying `static/css/tailwind-input.css`), using new Tailwind classes, you need to rebuild the CSS file:

```bash
npm install
npm run build-css
```

This will update the `static/css/tailwind.css` file to the latest version and include any classes needed.

## 📁 Project Structure

```text
awesome-selfhosted-web-gen/
├── src/                          # Source code
│   ├── __init__.py               # Package initialization
│   ├── config.py                 # Configuration management
│   ├── data_processor.py         # Data fetching and processing
│   ├── site_generator.py         # HTML generation engine
│   ├── template_helpers.py       # Jinja2 template utilities
│   └── utils.py                  # Utility functions
├── templates/                    # Jinja2 templates
│   ├── base/
│   │   └── base.html            # Base template with navigation
│   ├── pages/
│   │   ├── index.html           # Homepage
│   │   ├── browse.html          # Browse page
│   │   ├── alternatives.html    # Alternatives page
│   │   ├── statistics.html      # Statistics page
│   │   └── app_detail.html      # App detail pages
│   └── sitemap.xml              # Sitemap template
├── static/                      # Static assets
│   ├── css/
│   │   ├── custom.css           # Custom styles and enhanced filters
│   │   ├── tailwind.css         # Compiled Tailwind CSS
│   │   └── tailwind-input.css   # Tailwind source file
│   ├── js/
│   │   ├── app.js               # Main application JS
│   │   ├── app-detail.js        # Commit graph and detail page logic
│   │   ├── browse.js            # Browse page filtering and pagination
│   │   ├── search.js            # Search functionality with mobile support
│   │   └── theme.js             # Theme toggle
│   └── images/                  # Static images
│       ├── awesome.png          # Awesome logo
│       ├── favicon.ico          # Site favicon
│       └── logo.svg             # Site logo
├── output/                      # Generated website (created after build)
├── data/                        # Cached data files (created after fetch)
├── config.yml                   # Main configuration
├── generate.py                  # CLI entry point
├── requirements.txt             # Python dependencies
├── package.json                 # Node.js dependencies for CSS build
├── LICENSE                      # Project license
└── README.md                    # This file
```

## 📊 Data Processing

The generator processes data from awesome-selfhosted-data in several stages:

1. **Fetch**: Loads YAML data from the cloned repository including license information
2. **Process**: Converts raw data into structured Application objects with category-based organization
3. **Enhance**: Determines non-free applications using upstream `licenses-nonfree.yml` data
4. **Generate**: Creates search indexes, statistics, and related application suggestions
5. **Build**: Renders HTML templates with processed data and configurable UI elements

### Related Applications Algorithm

The system uses an automatic semantic similarity algorithm to suggest related applications. The algorithm discovers relationships by analyzing application descriptions without requiring manual keyword lists.

**Scoring factors:**

- **Semantic Similarity** (up to 25 points) - Automatic phrase matching between descriptions
- **Common Categories** (+4 points per shared category)
- **Alternative-to Relationships** (+6 points per shared alternative)
- **Fork Relationships** (+8 points for forks of same project)
- **Platform Compatibility** (+2 points per shared platform)
- **License Type** (+2 points for same license category: free/non-free)
- **Popularity Tier** (+1 point for similar star count ranges)
- **Dependency Status** (+1 point for matching third-party dependency requirements)

## ⚙️ Configuration

The `config.yml` file is used to configure the generator, and has the ability to re-brand the website and many more options.
To see all options possible and default values, see [config.yml](/config.yml).

### Templates

Templates use Jinja2 with extensive helper functions:

- `base/base.html` - Configurable layout with dynamic navigation and footer
- `pages/index.html` - Homepage with featured applications
- `pages/browse.html` - Enhanced filtering and pagination
- `pages/alternatives.html` - Alternative software
- `pages/statistics.html` - Data insights and trends
- `pages/app_detail.html` - Detailed app information with commit graphs and related apps

### Styling

The website uses Tailwind CSS with custom enhancements:

- Enhanced filter styling in `custom.css`
- Dark/light theme support
- Mobile-responsive design
- Custom color schemes configurable via templates

### JavaScript Modules

Client-side functionality is organized into specialized modules:

- `app.js` - Main application logic and initialization
- `browse.js` - Advanced filtering, sorting, and pagination
- `alternatives.js` - Alternatives page functionality and search
- `search.js` - Real-time search with mobile support
- `app-detail.js` - Commit graphs and detail page interactions
- `theme.js` - Dark/light theme toggle

## 🚀 Deployment

### Static Hosting

The generated website can be deployed to any static hosting service:

- Any static hosting service that supports HTML, CSS, and JavaScript
- Use the `output/` directory as the root of your website, no additional configuration is required

### Build Pipeline

Example GitHub Actions workflow:

```yaml
name: Build and Deploy
on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * *'  # Daily builds for fresh data

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.13'
      - name: Clone data repository
        run: git clone https://github.com/awesome-selfhosted/awesome-selfhosted-data.git
      - name: Install dependencies
        run: pip install -r requirements.txt
      # You probably want to add a step to overwrite the default config.yml with your own config.yml
      - name: Build website
        run: python ./generate.py build
      - name: Deploy
        # Deploy the output/ directory to your hosting service
```

## 📄 License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

The generated content includes data from [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data) which is licensed under [CC-BY-SA 3.0](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/LICENSE).

## 📜 Disclaimer

This project was created with the assistance of Large Language Models (LLMs).
Some portions of the code, documentation, and/or design may have been generated or refined using AI-based tools.

For transparency, the following models/tools were used during development:

- [OpenAI GPT-5](https://openai.com/index/introducing-gpt-5/) (for code suggestions, and documentation drafting)
- [OpenAI GPT-4o](https://openai.com/index/introducing-gpt-4o/) (for code suggestions, and documentation drafting)
- [Claude 4.1 Opus](https://www.anthropic.com/news/claude-opus-4-1) (for code suggestions, and some design suggestions)
- [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) (for code suggestions)
- [Cursor "Auto"](https://docs.cursor.com/en/models#auto) (for code suggestions)

While AI was used as a development aid, all outputs have been reviewed and, where necessary, modified by a human contributor.

## TODOs

- Make this into a proper Python package with `setup.py` and `pyproject.toml`, so it can be installed with `pip install awesome-selfhosted-web-gen` - How to do this? - Paused for now
- Bug: Action Buttons in the app detail page are not respecting the `open_in_new_tab_for_internal_links` and `open_in_new_tab_for_external_links` settings. - Is correctly generated (so webserver or browser issue?) - Maybe we define `_self` when we want to open in the same tab. - Defined, still not works as it get's replaced by `_blank`?? - Paused for now
- Add config ability to add a referer details to all outgoing links - Not required for inital release
- Can we put the filtering / sorting options on mobile under a menu to stop it take so much screen space? - Not required for inital release
- Simplify Code where possible - Not required for inital release
- Make license link in app detail page clickable if a license and the url for it are defined
- Move none SiteGenerator code away from src/site_generator.py (e.g. `_find_related_apps`) - Next release
