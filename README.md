# Awesome Self-Hosted Website Generator

A Python-based static site generator that creates a beautiful, interactive website from the [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) dataset.

## ✨ Features

- **📊 Data-Driven**: Automatically processes data from awesome-selfhosted-data repository
- **🎨 Modern UI**: Responsive design with dark/light themes and enhanced filters
- **🔍 Powerful Search**: Fuzzy search with mobile support
- **⚡ Static & Fast**: Pre-compiled HTML for lightning-fast loading
- **⚙️ Highly Configurable**: Configuration options for UI, navigation, and content
- **📈 Enhanced Analytics**: Line chart commit graphs with smart data requirements
- **🏷️ Smart Licensing**: Automatic non-free license detection using upstream data
- **🔍 Smart Description Parsing**: Extracts relevant information from the description of the application

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- pip package manager
- Cloned [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) repository

### Installation

1. **Clone the repository:**
```bash
git clone <your-repository-url>
cd awesome-selfhosted-generator
```

2. **Clone the data repository:**
```bash
git clone https://github.com/awesome-selfhosted/awesome-selfhosted-data/
```

3. **Create a virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Generate the website:**
```bash
python generate.py build --fetch-first
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
python generate.py -c custom-config.yaml build
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
│   ├── __init__.py              # Package initialization
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
│   │   ├── statistics.html      # Statistics page
│   │   └── app_detail.html      # App detail pages
│   └── sitemap.xml              # Sitemap template
├── static/                       # Static assets
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
├── output/                       # Generated website (created after build)
├── data/                         # Cached data files (created after fetch)
├── config.yml                    # Main configuration
├── generate.py                   # CLI entry point
├── requirements.txt              # Python dependencies
├── package.json                  # Node.js dependencies for CSS build
├── LICENSE                       # Project license
└── README.md                     # This file
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
- **Programming Language** (+3 points for same language)
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
- `search.js` - Real-time search with mobile support
- `app-detail.js` - Commit graphs and detail page interactions
- `theme.js` - Dark/light theme toggle

## 🔍 Enhanced Search Features

The website includes powerful search capabilities:

- **Fuzzy Search**: Finds results even with typos
- **Multi-field**: Searches names, descriptions, and categories
- **Real-time**: Instant results as you type
- **Mobile Support**: Dedicated mobile search interface
- **Smart Linking**: Search results link to detail pages instead of external sites
- **Filtering**: Advanced filters with dynamic license options
- **Sorting**: Multiple sorting options with visual feedback

## 🚀 Deployment

### Static Hosting

The generated website can be deployed to any static hosting service:

- **GitHub Pages**: Push the `output/` directory to a gh-pages branch
- **Netlify**: Connect your repository and set build command to `python generate.py build --fetch-first`
- **Vercel**: Similar to Netlify with automatic deployments
- **AWS S3**: Upload the `output/` directory to an S3 bucket
- **Any CDN**: The site is just static HTML/CSS/JS files

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
          python-version: '3.11'
      - name: Clone data repository
        run: git clone https://github.com/awesome-selfhosted/awesome-selfhosted-data/
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Build website
        run: python generate.py build --fetch-first
      - name: Deploy
        # Deploy the output/ directory to your hosting service
```

## 📄 License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

The generated content includes data from [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data) which is licensed under [CC-BY-SA 3.0](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/LICENSE).

## 🙏 Acknowledgments

- [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data) - For the amazing curated list
- [Tailwind CSS](https://tailwindcss.com/) - For the CSS framework
- [Jinja2](https://jinja.palletsprojects.com/) - For the templating engine

## TODOs

- Build a new Index / Home / Hero Page, which uses the awesome-selfhosted-data/markdown/header.md file as first section, and under there add the explanation of the icons and the awesome-selfhosted-data/markdown/footer.md file as last section. before addig the same call to action button as in the statistics page. Maybe also add some random apps to the page, a search bar and a browse button. Maybe also display 1 or 2 random categories. (Maybe add something last 3 apps updated or so...)
- Make this into a proper Python package with `setup.py` and `pyproject.toml`, so it can be installed with `pip install awesome-selfhosted-web-gen`
- Run `black` and `flake8` on the codebase to ensure code quality
- Bug: Action Buttons in the app detail page are not respecting the `open_in_new_tab_for_internal_links` and `open_in_new_tab_for_external_links` settings. - Is correctly generated (so webserver or browser issue?) - Maybe we define `_self` when we want to open in the same tab.
- Check if we still have somewhere the deprecated tags instead of categories (and remove them)
- Check for unused code and variables
- Long App Names can break the buttons both in desktop and mobile view
  - https://fs.ravshort.com/4wB7c.png
  - https://fs.ravshort.com/j0n1R.png
- Add config ability to add a referer details to all outgoing links
- Can we put the filtering / sorting options on mobile under a menu to stop it take so much screen space?
- Theme switching doesn't work anymore..
- Use in the browse page the same style for plattforms we do on the index page.
- Bug in Browse Page and app details when clicking on browse you land back on the index page.
- Bug in Index where parts of the footer are rendered, but not supposed to be.
- Test HTML minification
- Simplify Code where possible
- Simplify the config.yml file
- Simplify the markdown_to_html function in template_helpers.py py only adding support for the markdown features we need.