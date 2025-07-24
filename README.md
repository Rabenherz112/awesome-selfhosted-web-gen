# Awesome Self-Hosted Website Generator

A Python-based static site generator that creates a beautiful, interactive website from the [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) dataset.

## ✨ Features

- **📊 Data-Driven**: Automatically processes data from awesome-selfhosted-data repository
- **🎨 Modern UI**: Beautiful, responsive design with dark/light themes
- **🔍 Powerful Search**: Real-time fuzzy search with filtering capabilities
- **⚡ Static & Fast**: Pre-compiled HTML for lightning-fast loading
- **📱 Mobile-First**: Fully responsive design that works on all devices
- **🌐 SEO Optimized**: Pre-rendered content with proper meta tags and sitemaps
- **♿ Accessible**: WCAG 2.1 AA compliant with keyboard navigation support

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

6. **Start the development server:**
```bash
python generate.py serve --port 8000
```

7. **Open your browser:**
   Visit http://localhost:8000 to see your generated website!

## 📋 CLI Commands

### Main Commands

```bash
# Fetch and process data
python generate.py fetch

# Build the complete website
python generate.py build

# Serve the website locally
python generate.py serve --port 8000

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

# Serve and build in one command
python generate.py serve --build-first

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
│   │   └── base.html            # Base template
│   ├── pages/
│   │   ├── index.html           # Homepage
│   │   ├── browse.html          # Browse page
│   │   ├── category.html        # Category pages
│   │   └── app_detail.html      # App detail pages
│   └── sitemap.xml              # Sitemap template
├── static/                       # Static assets
│   ├── css/
│   │   └── custom.css           # Custom styles
│   ├── js/
│   │   ├── app.js               # Main application JS
│   │   ├── search.js            # Search functionality
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

1. **Fetch**: Loads YAML data from the cloned repository
2. **Process**: Converts raw data into structured Application objects  
3. **Generate**: Creates search indexes and statistics
4. **Build**: Renders HTML templates with processed data

## ⚙️ Configuration

Edit `config.yaml` to customize your website:

```yaml
site:
  title: "Your Site Title"
  description: "Your description"
  url: "https://your-domain.com"

generation:
  items_per_page: 24
  enable_search_index: true
  minify_html: false

search:
  fuzzy_threshold: 0.3
  max_results: 100
```

## 🎨 Customization

### Templates

Templates are located in the `templates/` directory and use Jinja2 syntax:

- `base/base.html` - Main layout template
- `pages/index.html` - Homepage template
- `pages/browse.html` - Application listing template
- `pages/category.html` - Category-specific template
- `pages/app_detail.html` - Individual app template

### Styling

The website uses Tailwind CSS with custom styles in `static/css/custom.css`. You can:

- Modify the Tailwind configuration in `base.html`
- Add custom CSS in `custom.css`
- Customize color schemes and themes

### JavaScript

Client-side functionality is split into modules:

- `app.js` - Main application logic
- `search.js` - Search and filtering
- `theme.js` - Dark/light theme toggle

## 🔍 Search Features

The website includes powerful search capabilities:

- **Fuzzy Search**: Finds results even with typos
- **Multi-field**: Searches names, descriptions, tags, and categories
- **Real-time**: Instant results as you type
- **Filtering**: Filter by category, language, license, etc.
- **Sorting**: Sort by name, stars, activity, relevance

## 🚀 Deployment

### Static Hosting

The generated website can be deployed to any static hosting service:

- **GitHub Pages**: Push the `output/` directory to a gh-pages branch
- **Netlify**: Connect your repository and set build command to `python generate.py build`
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
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Build website
        run: python generate.py build --fetch-first
      - name: Deploy
        # Deploy the output/ directory to your hosting service
```

## 🔧 Development

### Development Workflow

1. **Make changes** to templates, styles, or Python code
2. **Use watch mode** for automatic rebuilds:
   ```bash
   python generate.py watch
   ```
3. **Test locally** with the development server:
   ```bash
   python generate.py serve
   ```

### Adding Features

1. **Templates**: Add new Jinja2 templates in `templates/`
2. **Styles**: Modify `static/css/custom.css` or Tailwind config
3. **JavaScript**: Add functionality to appropriate JS modules
4. **Python**: Extend functionality in the `src/` modules

### Testing

Run basic tests:

```bash
# Test configuration loading
python generate.py info

# Test data fetching
python generate.py fetch

# Test site generation
python generate.py build

# Validate output
python generate.py serve --port 8000
```

## 📈 Performance

The generated website is optimized for performance:

- **Static Files**: No server-side processing required
- **Optimized Assets**: Minified CSS/JS, compressed images
- **CDN Ready**: All assets can be cached and distributed globally
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Lazy Loading**: Images and content loaded on demand

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) - For the amazing curated list
- [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data) - For the structured data
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework
- [Jinja2](https://jinja.palletsprojects.com/) - For the powerful templating engine

## 🆘 Support

If you encounter issues:

1. Check the [documentation](#-configuration)
2. Run `python generate.py info` to verify your setup
3. Check the console output for error messages
4. Open an issue on GitHub with details about your problem

---

**Happy self-hosting! 🏠✨** 