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

## 📁 Project Structure

```
awesome-selfhosted-generator/
├── src/                          # Source code
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
│   │   └── custom.css           # Custom styles and enhanced filters
│   ├── js/
│   │   ├── app.js               # Main application JS
│   │   ├── app-detail.js        # Commit graph and detail page logic
│   │   ├── browse.js            # Browse page filtering and pagination
│   │   ├── search.js            # Search functionality with mobile support
│   │   └── theme.js             # Theme toggle
│   └── images/                  # Static images
├── output/                       # Generated website (created after build)
├── data/                         # Cached data files (created after fetch)
├── config.yaml                   # Main configuration
├── generate.py                   # CLI entry point
├── requirements.txt              # Python dependencies
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

The system uses an intelligent scoring algorithm to suggest related applications based on:
- **Common Categories** (+4 points per shared category)
- **Platform Compatibility** (+2 points per shared platform)
- **Programming Language** (+3 points for same language)
- **License Type** (+2 points for same license category: free/non-free)
- **Popularity Tier** (+1 point for similar star count ranges)
- **Dependency Status** (+1 point for matching third-party dependency requirements)

## ⚙️ Configuration

Edit `config.yaml` to extensively customize your website:

```yaml
site:
  title: "Awesome Self-Hosted"
  description: "Discover amazing self-hosted applications"
  url: "https://your-domain.com"
  author: "Your Name"

# Generation settings
generation:
  items_per_page: 60
  enable_search_index: true
  minify_html: false

# Search configuration
search:
  fuzzy_threshold: 0.3
  max_results: 100
  placeholder_text: "Search applications..."

# Extensive UI configuration
ui:
  # Page title formatting
  title_format: "{page_title} - {site_title}"
  title_separator: " - "
  
  # Navigation menu items
  navigation:
    - title: "Browse"
      url: "/"
    - title: "Statistics"
      url: "/statistics.html"
  
  # Footer configuration
  footer:
    logo_text: "{{ site.title }}"
    tagline: "{{ site.description }}"
    credit_text: "Built with ❤️ for the self-hosting community"
    copyright_text: "Copyright © 2015-2025, the {{ site.title }} community. Data from"
    data_source_text: "awesome-selfhosted-data"
    data_source_url: "https://github.com/awesome-selfhosted/awesome-selfhosted-data"
    license_text: "Content under CC-BY-SA 3.0 license"
    license_url: "https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/LICENSE"
    
    # Footer sections with links
    sections:
      navigation:
        title: "Navigation"
        links:
          - title: "Home"
            url: "/"
          - title: "Statistics"
            url: "/statistics.html"
      resources:
        title: "Resources"
        links:
          - title: "GitHub"
            url: "https://github.com/awesome-selfhosted/awesome-selfhosted"
            external: true
          - title: "Data Source"
            url: "https://github.com/awesome-selfhosted/awesome-selfhosted-data"
            external: true
  
  # Page-specific configuration
  pages:
    browse:
      title: "Browse Applications"
      description: "Discover {total_applications} self-hosted applications"
    statistics:
      title: "Statistics"
      description: "Explore trends and insights from the self-hosted community"
    home:
      meta_title: "Discover Self-Hosted Applications"
      meta_description: "Find the perfect self-hosted applications for your needs"
```

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

- Replace `cdn.tailwindcss.com` with local files if possible.
- Add some kind of fail safe to the browe page, if the user doesn't use javascript.
- Check if I can show 250 characters of the description in the browse page.
  - Add the ability to set this in config
  - With setings `max_description_length` (Configure the maximal lenght before the description is cut off with `...`), `show_full_description` (Can be toggeld to show the full description) and `description_fade` (Can be toggeld to fade the description if too long instead of cutting it off)
- Build a new Index Page, which uses the awesome-selfhosted-data/markdown/header.md file as first section, and under there add the explanation of the icons and the awesome-selfhosted-data/markdown/footer.md file as last section. before addig the same call to action button as in the statistics page.
- Test if no pagination works and if the performance changes.
- Make this into a proper Python package with `setup.py` and `pyproject.toml`, so it can be installed with `pip install awesome-selfhosted-web-gen`
- Add the short license information for each application in the browse page, so the user can see what license the application has
- Stop that new links are opend in a new tab by default, make this a configuration option
- Run `black` and `flake8` on the codebase to ensure code quality
- Test if code still works after updating the dependencies in `requirements.txt`
- Move Categories from the app detail page down where also Platforms are shown.
- The Source Code Icon in the app detail page should only show a github icon, if the link is a github link. it should show a gitlab icon if the link is a gitlab link and otherwise show the git icon.