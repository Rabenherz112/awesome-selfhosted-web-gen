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
        
        if (!commitHistoryData || commitHistoryData.trim() === '' || commitHistoryData === 'null') {
            graphContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No commit data available</div>';
            return;
        }

        try {
            const commitHistory = JSON.parse(commitHistoryData);
            
            // Only render if we have at least 3 months of data
            if (!commitHistory || typeof commitHistory !== 'object' || Object.keys(commitHistory).length < 3) {
                graphContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">Not enough commit data to display graph (minimum 3 months required)</div>';
                return;
            }
            
            this.createCommitLineGraph(graphContainer, commitHistory);
        } catch (error) {
            console.error('Error parsing commit history data:', error);
            console.error('Raw data was:', commitHistoryData);
            graphContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No commit data available (an error occurred)</div>';
        }
    }

    createCommitLineGraph(container, commitHistory) {
        // Sort months chronologically
        const sortedMonths = Object.keys(commitHistory).sort();
        
        if (sortedMonths.length < 3) return;

        // Calculate max commits for scaling and average for display
        const maxCommits = Math.max(...Object.values(commitHistory));
        const minCommits = Math.min(...Object.values(commitHistory));
        const totalCommits = Object.values(commitHistory).reduce((sum, commits) => sum + commits, 0);
        const averageCommits = Math.round(totalCommits / sortedMonths.length);
        
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
                Average: <span class="font-medium text-blue-600 dark:text-blue-400">${averageCommits} commits/month</span>
            </div>
        `;
        graph.appendChild(stats);

        // Create SVG line chart (made wider)
        const svgWidth = Math.max(800, sortedMonths.length * 70);
        const svgHeight = 200;
        const padding = { top: 20, right: 30, bottom: 40, left: 40 };
        const chartWidth = svgWidth - padding.left - padding.right;
        const chartHeight = svgHeight - padding.top - padding.bottom;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute('class', 'overflow-visible');
        
        // Create points for the line
        const points = sortedMonths.map((month, index) => {
            const x = padding.left + (index / (sortedMonths.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((commitHistory[month] / maxCommits) * chartHeight);
            return { x, y, month, commits: commitHistory[month] };
        });
        
        // Create the line path
        const pathData = points.map((point, index) => 
            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        ).join(' ');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgb(34, 197, 94)'); // green-500
        path.setAttribute('stroke-width', '2');
        path.setAttribute('class', 'transition-all duration-200');
        svg.appendChild(path);
        
        // Add area under the curve
        const areaData = pathData + ` L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
        const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        area.setAttribute('d', areaData);
        area.setAttribute('fill', 'rgba(34, 197, 94, 0.1)'); // green-500 with opacity
        area.setAttribute('class', 'transition-all duration-200');
        svg.insertBefore(area, path);
        
        // Add data points
        points.forEach(point => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', 'rgb(34, 197, 94)'); // green-500
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('class', 'cursor-pointer hover:r-6 transition-all duration-200');
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${this.formatMonth(point.month)}: ${point.commits} commits`;
            circle.appendChild(title);
            
            svg.appendChild(circle);
        });
        
        // Add X-axis labels
        points.forEach((point, index) => {
            if (index % Math.ceil(points.length / 8) === 0 || index === points.length - 1) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', point.x);
                text.setAttribute('y', svgHeight - 10);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('class', 'text-xs fill-gray-500 dark:fill-gray-400');
                text.textContent = this.formatMonth(point.month);
                svg.appendChild(text);
            }
        });
        
        // Add Y-axis labels
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const value = Math.round((maxCommits / yTicks) * i);
            const y = padding.top + chartHeight - (i / yTicks) * chartHeight;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', padding.left - 10);
            text.setAttribute('y', y + 4);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('class', 'text-xs fill-gray-500 dark:fill-gray-400');
            text.textContent = value;
            svg.appendChild(text);
            
            // Add grid lines
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', padding.left);
            line.setAttribute('y1', y);
            line.setAttribute('x2', padding.left + chartWidth);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'rgba(156, 163, 175, 0.2)'); // gray-400 with opacity
            line.setAttribute('stroke-dasharray', '2,2');
            svg.insertBefore(line, area);
        }
        
        // Add chart container with overflow scroll
        const chartContainer = document.createElement('div');
        chartContainer.className = 'w-full overflow-x-auto';
        chartContainer.appendChild(svg);
        graph.appendChild(chartContainer);
        
        // Clear container and add graph
        container.innerHTML = '';
        container.appendChild(graph);
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