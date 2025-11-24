# Awesome Selfhosted Website Generator (ASWG)

A Python-based static site generator that creates an interactive website from the [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data/) dataset.

## Features

- **Data-Driven**: Automatically processes data from awesome-selfhosted-data repository
- **Modern UI**: Responsive design with dark/light themes and enhanced filters
- **Powerful Search**: Fuzzy search with mobile support
- **Static & Fast**: Pre-compiled HTML for fast loading
- **Highly Configurable**: Configuration options for UI, navigation, and content
- **Analytics**: Line chart commit graphs with smart data requirements
- **Smart Licensing**: Automatic non-free license detection using upstream data
- **Description Parsing**: Extracts relevant information from application descriptions
- **Alternatives**: Optionally generate an alternatives page with smart grouping

## Quick Start

### Installation

1. Create a virtual environment:

  ```bash
  sudo apt install python3-venv python3-pip
  python3 -m venv ~/.venv
  source ~/.venv/bin/activate
  ```

2. Install the package:

  ```bash
  pip install https://github.com/Rabenherz112/awesome-selfhosted-web-gen/releases/latest
  ```

3. Clone the data repository:

  ```bash
  git clone https://github.com/awesome-selfhosted/awesome-selfhosted-data.git
  ```

4. Generate the website:

  ```bash
  aswg build
  ```

5. View your website:

   Open the `output/index.html` file in your browser.

## CLI Commands

### Main Commands

```bash
# Fetch and process data
aswg fetch

# Build the complete website
aswg build

# Watch for changes and rebuild automatically
aswg watch

# Clean output and cache directories
aswg clean

# Show configuration info
aswg info
```

### Command Options

```bash
# Build with fresh data
aswg build --fetch-first

# Watch with custom interval (seconds)
aswg watch --interval 3

# Use custom config file
aswg --config custom-config.yaml build
```

## Development

### Installing from Source

```bash
git clone https://github.com/Rabenherz112/awesome-selfhosted-web-gen.git
cd awesome-selfhosted-web-gen
pip install -e .
```

### CSS Development

When modifying `static/css/tailwind-input.css` or using new Tailwind classes, rebuild the CSS:

```bash
npm install
npm run build-css
```

This updates `static/css/tailwind.css` with the latest version and includes any new classes.

## How It Works

The generator processes data in several stages:

1. **Fetch**: Loads YAML data from the cloned repository including license information
2. **Process**: Converts raw data into structured Application objects with category-based organization
3. **Enhance**: Determines non-free applications using upstream `licenses-nonfree.yml` data
4. **Generate**: Creates search indexes, statistics, and related application suggestions
5. **Build**: Renders HTML templates with processed data and configurable UI elements

### Related Applications Algorithm

The system uses an automatic semantic similarity algorithm to suggest related applications by analyzing application descriptions.

**Scoring factors:**

- Semantic Similarity (up to 25 points) - Automatic phrase matching between descriptions
- Common Categories (+4 points per shared category)
- Alternative-to Relationships (+6 points per shared alternative)
- Fork Relationships (+8 points for forks of same project)
- Platform Compatibility (+2 points per shared platform)
- License Type (+2 points for same license category: free/non-free)
- Popularity Tier (+1 point for similar star count ranges)
- Dependency Status (+1 point for matching third-party dependency requirements)

## Configuration

The `config.yml` file configures the generator and allows rebranding the website. See [config.yml](./config/config.yml) for all available options and default values.

## Deployment

### Static Hosting

The generated website can be deployed to any static hosting service. Use the `output/` directory as the root of your website - no additional configuration is required.

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
      - uses: actions/checkout@v5
      - name: Setup Python
        uses: actions/setup-python@v6
        with:
          python-version: '3.13'
      - name: Clone data repository
        run: pip install https://github.com/Rabenherz112/awesome-selfhosted-web-gen/releases/latest
      # You probably want to add a step to overwrite the default config/config.yml with your own config.yml
      - name: Build website
        run: aswg build
      - name: Deploy
        # Deploy the output/ directory to your hosting service
```

## License

This project is licensed under the AGPL-3.0 License - see the LICENSE file for details.

The generated content includes data from [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data) which is licensed under [CC-BY-SA 3.0](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/LICENSE).

## Disclaimer

This project was created with the assistance of Large Language Models (LLMs). Some portions of the code, documentation, and/or design may have been generated or refined using AI-based tools.

For transparency, the following models/tools were used during development:

- OpenAI [GPT-5](https://openai.com/index/introducing-gpt-5/), [GPT-4o](https://openai.com/index/introducing-gpt-4o/) (code suggestions and documentation drafting)
- [Claude 4.5 Sonnet](https://www.anthropic.com/news/claude-sonnet-4-5), [Claude 4.1 Opus](https://www.anthropic.com/news/claude-opus-4-1), [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) (code suggestions and design suggestions)
- [Cursor "Auto"](https://docs.cursor.com/en/models#auto) (code suggestions)

While AI was used as a development aid, all outputs have been reviewed and, where necessary, modified by a human contributor.
