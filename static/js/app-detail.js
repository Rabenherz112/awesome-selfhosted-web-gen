// App detail page functionality
class AppDetail {
    constructor() {
        this.init();
    }

    init() {
        this.renderCommitGraph();
    }

    renderCommitGraph() {
        const graphContainer = document.getElementById('commit-activity-graph');
        if (!graphContainer) return;

        const commitHistoryData = graphContainer.getAttribute('data-commit-history');
        if (!commitHistoryData) return;

        try {
            const commitHistory = JSON.parse(commitHistoryData);
            this.createCommitGraph(graphContainer, commitHistory);
        } catch (error) {
            console.error('Error parsing commit history data:', error);
        }
    }

    createCommitGraph(container, commitHistory) {
        // Sort months chronologically
        const sortedMonths = Object.keys(commitHistory).sort();
        
        if (sortedMonths.length === 0) return;

        // Calculate max commits for scaling
        const maxCommits = Math.max(...Object.values(commitHistory));
        const minCommits = Math.min(...Object.values(commitHistory));
        
        // Create graph container
        const graph = document.createElement('div');
        graph.className = 'commit-graph flex flex-col space-y-4';
        
        // Add title and stats
        const stats = document.createElement('div');
        stats.className = 'flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4';
        stats.innerHTML = `
            <div>
                <span class="font-medium">${sortedMonths.length}</span> months of activity
            </div>
            <div>
                Peak: <span class="font-medium text-green-600 dark:text-green-400">${maxCommits} commits/month</span>
            </div>
        `;
        graph.appendChild(stats);

        // Create the bar chart
        const chartContainer = document.createElement('div');
        chartContainer.className = 'flex items-end space-x-1 h-32 overflow-x-auto pb-2';
        
        sortedMonths.forEach(month => {
            const commits = commitHistory[month];
            
            // Create bar wrapper
            const barWrapper = document.createElement('div');
            barWrapper.className = 'flex flex-col items-center min-w-[24px]';
            
            // Create bar
            const bar = document.createElement('div');
            const height = maxCommits > 0 ? Math.max(2, (commits / maxCommits) * 100) : 2;
            const intensity = commits === 0 ? 0 : Math.ceil((commits / maxCommits) * 4);
            
            bar.className = `w-3 rounded-sm transition-all duration-200 hover:opacity-80 cursor-help ${this.getBarColor(intensity)}`;
            bar.style.height = `${height}%`;
            bar.title = `${this.formatMonth(month)}: ${commits} commits`;
            
            // Create month label
            const label = document.createElement('div');
            label.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap';
            label.textContent = this.formatMonth(month);
            
            barWrapper.appendChild(bar);
            barWrapper.appendChild(label);
            chartContainer.appendChild(barWrapper);
        });
        
        graph.appendChild(chartContainer);
        
        // Add legend
        const legend = document.createElement('div');
        legend.className = 'flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-4';
        legend.innerHTML = `
            <div class="flex items-center space-x-1">
                <span>Less</span>
                <div class="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700"></div>
                <div class="w-2 h-2 rounded-sm bg-green-200 dark:bg-green-900"></div>
                <div class="w-2 h-2 rounded-sm bg-green-400 dark:bg-green-700"></div>
                <div class="w-2 h-2 rounded-sm bg-green-600 dark:bg-green-500"></div>
                <div class="w-2 h-2 rounded-sm bg-green-800 dark:bg-green-400"></div>
                <span>More</span>
            </div>
        `;
        graph.appendChild(legend);
        
        // Clear container and add graph
        container.innerHTML = '';
        container.appendChild(graph);
    }

    getBarColor(intensity) {
        const colors = [
            'bg-gray-200 dark:bg-gray-700',      // 0 commits
            'bg-green-200 dark:bg-green-900',    // Low activity
            'bg-green-400 dark:bg-green-700',    // Medium-low activity
            'bg-green-600 dark:bg-green-500',    // Medium-high activity
            'bg-green-800 dark:bg-green-400'     // High activity
        ];
        return colors[intensity] || colors[0];
    }

    formatMonth(monthStr) {
        try {
            const [year, month] = monthStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                year: '2-digit' 
            });
        } catch (error) {
            return monthStr;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new AppDetail();
}); 