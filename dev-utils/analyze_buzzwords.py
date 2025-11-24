#!/usr/bin/env python3
"""
Targeted analysis on cached data for analyzing improvements to the semantic similarity algorithm.
This script checks for words that are too generic or marketing buzzwords and provides recommendations to improve the semantic similarity algorithm.
"""

import json
from pathlib import Path
import sys

# Add project root directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from aswg.config import Config

# Current generic words (from aswg/site_generator.py)
CURRENT_GENERIC = {
    # Articles and prepositions
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "you",
    "your",
    # Common verbs
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    # Pronouns and determiners
    "that",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "only",
    "own",
    "same",
    # Common adverbs and adjectives
    "so",
    "than",
    "too",
    "very",
    "just",
    "now",
    "also",
    "different",
    "small",
    "large",
    "new",
    "old",
    "good",
    "great",
    "first",
    "last",
    "long",
    "little",
    "right",
    "big",
    "high",
    "following",
    "local",
    "sure",
    # Common action words that don't indicate domain
    "using",
    "used",
    "use",
    "like",
    "way",
    "make",
    "get",
    "go",
    "know",
    "take",
    "see",
    "come",
    "think",
    "look",
    "want",
    "give",
    "without",
    "including",
    "provides",
    "allows",
    "supports",
    # Common adverisment words
    "best",
    "new",
    "free",
    "powerful",
    "easy",
    "simple",
    "fast",
    "secure",
    "reliable",
    "open-source",
    "open source",
    "self-hosted",
    "self hosted",
    "community",
    "enterprise",
    "lightweight",
    "high-performance",
    # List specific
    "software",
}

# Current buzzwords (from aswg/site_generator.py)
CURRENT_BUZZWORDS = {
    "server",
    "web",
    "management",
    "platform",
    "system",
    "application",
    "lightweight",
    "high-performance",
    "modern",
}


def analyze_top_words_for_generic_candidates(word_counts, word_in_apps, word_in_categories, total_apps):
    """Analyze the most frequent words for generic word candidates."""
    
    recommendations = {
        'missing_generic': [],
        'move_to_generic': [],
        'move_to_buzzwords': [],
        'technical_keep': []
    }
    
    # Analyze top 50 most frequent words
    for word, count in word_counts.most_common(50):
        if word in CURRENT_GENERIC or word in CURRENT_BUZZWORDS:
            continue
            
        app_percentage = len(word_in_apps[word]) / total_apps * 100
        category_count = len(word_in_categories[word])
        
        # Very high frequency words that appear everywhere = generic noise
        if app_percentage > 25:
            recommendations['missing_generic'].append({
                'word': word,
                'count': count,
                'app_percentage': app_percentage,
                'categories': category_count,
                'reason': f'Appears in {app_percentage:.1f}% of apps - likely structural word'
            })
        
        # High frequency + promotional/descriptive = marketing buzzword
        elif app_percentage > 15 and is_marketing_buzzword(word):
            recommendations['move_to_generic'].append({
                'word': word,
                'count': count,
                'app_percentage': app_percentage,
                'categories': category_count,
                'reason': f'Marketing buzzword appearing in {app_percentage:.1f}% of apps'
            })
        
        # Medium-high frequency + cross-category = common technical term
        elif app_percentage > 8 and category_count > 30:
            recommendations['move_to_buzzwords'].append({
                'word': word,
                'count': count,
                'app_percentage': app_percentage,
                'categories': category_count,
                'reason': f'Common technical term across {category_count} categories'
            })
        
        # Lower frequency but still notable = keep with full weight
        elif app_percentage > 3:
            recommendations['technical_keep'].append({
                'word': word,
                'count': count,
                'app_percentage': app_percentage,
                'categories': category_count,
                'reason': f'Domain-specific term in {app_percentage:.1f}% of apps'
            })
    
    return recommendations


def is_marketing_buzzword(word):
    """Check if a word is likely a marketing buzzword."""
    marketing_words = {
        # Performance claims
        'fast', 'quick', 'rapid', 'instant', 'lightning', 'blazing', 'high-speed', 
        'optimized', 'efficient', 'performant', 'speed', 'faster',
        
        # Quality claims  
        'professional', 'enterprise', 'commercial', 'production', 'robust', 
        'solid', 'reliable', 'stable', 'secure', 'trusted', 'quality',
        
        # Ease claims
        'easy', 'simple', 'effortless', 'intuitive', 'user-friendly', 
        'straightforward', 'seamless', 'hassle-free', 'quick', 'smooth',
        
        # Completeness claims
        'complete', 'comprehensive', 'full-featured', 'all-in-one', 
        'everything', 'total', 'entire', 'full', 'rich',
        
        # Superlatives
        'best', 'top', 'leading', 'premier', 'ultimate', 'perfect', 
        'ideal', 'superior', 'excellent', 'amazing', 'awesome', 'incredible',
        
        # Modernity claims
        'modern', 'latest', 'cutting-edge', 'state-of-the-art', 'advanced', 
        'next-generation', 'revolutionary', 'innovative', 'fresh',
        
        # Flexibility claims
        'flexible', 'versatile', 'adaptable', 'customizable', 'configurable',
        'extensible', 'scalable', 'modular', 'powerful',
        
        # Size claims
        'lightweight', 'small', 'tiny', 'minimal', 'compact', 'slim'
    }
    
    return word.lower() in marketing_words


def main():
    """Run targeted analysis."""
    print("🎯 Running targeted analysis for cached data...")
    
    # Load data
    config = Config('config/config.yml')
    cache_file = config.data_cache_dir / 'processed_data.json'
    
    if not cache_file.exists():
        print("❌ No cached data found. Run 'python generate.py build' first.")
        return
    
    with open(cache_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    applications = data['applications']
    
    # Quick analysis similar to existing results
    from collections import Counter, defaultdict
    import re
    
    word_counts = Counter()
    word_in_apps = defaultdict(set)
    word_in_categories = defaultdict(set)
    
    for app_data in applications:
        description = app_data.get('description', '')
        if not description:
            continue
            
        # Clean text
        cleaned = re.sub(r"[^\w\s\-]", " ", description.lower())
        words = [w for w in cleaned.split() if len(w) > 2 and not w.isdigit()]
        
        app_id = app_data.get('id', '')
        categories = app_data.get('categories', [])
        
        for word in words:
            word_counts[word] += 1
            word_in_apps[word].add(app_id)
            for category in categories:
                word_in_categories[word].add(category)
    
    total_apps = len(applications)
    
    # Run targeted analysis
    recommendations = analyze_top_words_for_generic_candidates(
        word_counts, word_in_apps, word_in_categories, total_apps
    )
    
    # Print results with clearer categorization guidance
    print(f"\n🎯 OPTIMIZATION RECOMMENDATIONS FOR CACHED DATA")
    print("=" * 70)
    
    print(f"\n📝 ADD TO generic_words (completely filter - weight = 0):")
    print(f"    These provide NO semantic value for finding similar apps:")
    
    all_generic_additions = []
    
    # Missing structural words
    if recommendations['missing_generic']:
        print(f"\n    Missing structural words:")
        for item in recommendations['missing_generic']:
            print(f"    • '{item['word']}' - {item['count']} times ({item['app_percentage']:.1f}% apps)")
            all_generic_additions.append(item['word'])
    
    # Marketing noise
    if recommendations['move_to_generic']:
        print(f"\n    Marketing terms to filter completely:")
        for item in recommendations['move_to_generic']:
            print(f"    • '{item['word']}' - {item['reason']}")
            all_generic_additions.append(item['word'])
    
    if all_generic_additions:
        print(f"\n    💡 Add to generic_words set:")
        print(f"    {', '.join(f'\"' + word + '\"' for word in all_generic_additions)}")
    else:
        print("    ✅ generic_words list looks good!")
    
    print(f"\n🏷️  ADD TO common_buzzwords (reduce weight - weight * 0.9):")
    print(f"    These have SOME semantic value but are overused:")
    
    if recommendations['move_to_buzzwords']:
        buzzword_additions = []
        print(f"\n    Technical terms to reduce weight:")
        for item in recommendations['move_to_buzzwords']:
            print(f"    • '{item['word']}' - {item['count']} times ({item['app_percentage']:.1f}% apps)")
            buzzword_additions.append(item['word'])
        
        print(f"\n    💡 Add to common_buzzwords list:")
        print(f"    {', '.join(f'\"' + word + '\"' for word in buzzword_additions)}")
    else:
        print("    ✅ common_buzzwords list covers the main cases!")
    
    print(f"\n⚙️ KEEP AS-IS (full semantic weight):")
    if recommendations['technical_keep']:
        print(f"    These domain-specific terms should keep full weight:")
        for item in recommendations['technical_keep'][:6]:
            print(f"    • '{item['word']}' - {item['reason']}")
    
    # Show top 20 most frequent words for context
    print(f"\n📊 TOP 20 MOST FREQUENT WORDS FOR CONTEXT:")
    
    for i, (word, count) in enumerate(word_counts.most_common(20), 1):
        app_percentage = len(word_in_apps[word]) / total_apps * 100
        
        if word in CURRENT_GENERIC:
            status = "🔴 GENERIC"
        elif word in CURRENT_BUZZWORDS:
            status = "🟡 BUZZWORD"
        else:
            status = "⚪ NORMAL"
            
        print(f"    {i:2d}. '{word}' - {count} times ({app_percentage:.1f}%) {status}")
    print("=" * 70)

if __name__ == '__main__':
    main()