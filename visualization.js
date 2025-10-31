// TOP OF visualizaton.js

const cityNames = ["Tikal", "Palenque", "Chichen Itza", "Copan", "Uxmal"];
const svg = document.getElementById("graph-svg");

// Get matrix from localStorage, or null if it doesn't exist
const matrixString = localStorage.getItem('adjacencyMatrix');
const matrix = matrixString ? JSON.parse(matrixString) : null;

// Get start and goal nodes with a robust check
const startNodeString = localStorage.getItem('startNode');
const goalNodeString = localStorage.getItem('goalNode');

// Default to node 0 if localStorage values are not found or invalid
const startNode = startNodeString !== null && !isNaN(parseInt(startNodeString)) ? parseInt(startNodeString) : 0;
const goalNode = goalNodeString !== null && !isNaN(parseInt(goalNodeString)) ? parseInt(goalNodeString) : 0;

// UI Elements
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const resetBtn = document.getElementById("reset-btn");
const algoSelect = document.getElementById("algorithm-select");
const currentPathDisplay = document.getElementById("current-path");
const expandedList = document.getElementById("expanded-list");
const fringeLabel = document.getElementById("fringe-label");
const stepExplanation = document.getElementById("step-explanation");
const nodePositions = {};
let algorithm = null;
let state = {};

// Helper to draw the graph with SVG
function drawGraph() {
    svg.innerHTML = '';
    const numNodes = matrix.length;
    const radius = 150;
    const centerX = 200;
    const centerY = 200;

    // Calculate node positions in a circle
    for (let i = 0; i < numNodes; i++) {
        const angle = (i / numNodes) * 2 * Math.PI;
        nodePositions[i] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    }

    // Draw edges first (so they are under the nodes)
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (matrix[i][j] === 1) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", nodePositions[i].x);
                line.setAttribute("y1", nodePositions[i].y);
                line.setAttribute("x2", nodePositions[j].x);
                line.setAttribute("y2", nodePositions[j].y);
                line.setAttribute("class", "edge");
                line.setAttribute("id", `edge-${i}-${j}`);
                svg.appendChild(line);
            }
        }
    }

    // Draw nodes
    for (let i = 0; i < numNodes; i++) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", nodePositions[i].x);
        circle.setAttribute("cy", nodePositions[i].y);
        circle.setAttribute("r", 25);
        circle.setAttribute("class", "node");
        circle.setAttribute("data-id", i);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", nodePositions[i].x);
        text.setAttribute("y", nodePositions[i].y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "node-label");
        text.textContent = cityNames[i];

        g.appendChild(circle);
        g.appendChild(text);
        svg.appendChild(g);
    }
}

// Update the visual representation
function updateVisualization() {
    const currentNode = state.currentPath.length > 0 ? state.currentPath[state.currentPath.length - 1] : null;

    document.querySelectorAll(".node").forEach(node => {
        const id = parseInt(node.dataset.id);
        node.classList.remove("expanded", "current", "in-fringe");

        if (currentNode === id) {
            node.classList.add("current");
        } else if (state.expanded.includes(id)) {
            node.classList.add("expanded");
        }
    });

    // Reset all nodes in fringe as a whole, then add them
    document.querySelectorAll(".node").forEach(node => {
        node.classList.remove("in-fringe");
    });
    const fringeNodes = new Set(state.fringe.map(path => path[path.length - 1]));
    fringeNodes.forEach(id => {
        document.querySelector(`.node[data-id="${id}"]`).classList.add("in-fringe");
    });

    document.querySelectorAll(".edge").forEach(edge => {
        const [id1, id2] = edge.id.replace("edge-", "").split("-").map(Number);
        const isPath = state.currentPath.includes(id1) && state.currentPath.includes(id2) && Math.abs(state.currentPath.indexOf(id1) - state.currentPath.indexOf(id2)) === 1;
        edge.classList.toggle("path-taken", isPath);
    });

    currentPathDisplay.textContent = state.currentPath.length > 0 ? state.currentPath.map(id => cityNames[id]).join(" → ") : "None";

    expandedList.innerHTML = state.expanded.map(id => `<li>${cityNames[id]}</li>`).join("");

    const fringeList = document.getElementById("fringe-list");
    fringeList.innerHTML = state.fringe.map(path => `<li>${path.map(id => cityNames[id]).join(" → ")}</li>`).join("");
}

// Explanation Text
function updateExplanation() {
    // FIX: Add a check for an empty currentPath to prevent the error
    if (state.currentPath.length === 0) {
        stepExplanation.innerHTML = `Ixchel is about to begin her journey from **${cityNames[startNode]}**. The path to this city is placed in the fringe to be explored. Click 'Next Step' to begin.`;
        return;
    }

    if (state.currentPath.length > 0 && state.isGoal) {
        stepExplanation.innerHTML = `**Goal Found!** The shortest path to **${cityNames[goalNode]}** is: ${state.currentPath.map(id => `<b>${cityNames[id]}</b>`).join(" → ")}. The search is complete!`;
        nextBtn.disabled = true;
        return;
    }

    if (state.fringe.length === 0 && state.currentPath.length === 0) {
        stepExplanation.textContent = `The algorithm has finished! Ixchel has explored all possible paths.`;
        nextBtn.disabled = true;
        return;
    }
    
    // Check if the current path is a result of skipping an already expanded node
    const lastNode = state.currentPath[state.currentPath.length - 1];
    if (state.skippedPath) {
        const pathStr = state.skippedPath.map(id => `<b>${cityNames[id]}</b>`).join(" → ");
        stepExplanation.innerHTML = `The path **${pathStr}** leads to a city that has already been expanded (explored). We ignore this path and move to the next.`;
        state.skippedPath = null;
    } else {
        const description = `Ixchel has just arrived at **${cityNames[lastNode]}**. This city has not been expanded before, so she will now explore its paths and adds its neighbors to her map of future paths to explore.`;
        stepExplanation.innerHTML = description;
    }
}


// Step-by-step logic for BFS and DFS
function runNextStep() {
    if (state.fringe.length === 0) {
        state.currentPath = [];
        updateVisualization();
        updateExplanation();
        return;
    }

    const currentPath = (algorithm === "bfs") ? state.fringe.shift() : state.fringe.pop();
    const currentNode = currentPath[currentPath.length - 1];

    // Check if the node has already been expanded *before* processing it
    if (state.expanded.includes(currentNode)) {
        state.skippedPath = currentPath;
        state.currentPath = currentPath;
        updateVisualization();
        updateExplanation();
        runNextStep();
        return;
    }
    
    state.expanded.push(currentNode);
    state.currentPath = currentPath;

    if (currentNode === goalNode) {
        state.isGoal = true;
        updateVisualization();
        updateExplanation();
        return;
    }

    const neighbors = matrix[currentNode];
    const newPaths = [];
    for (let i = 0; i < neighbors.length; i++) {
        if (neighbors[i] === 1) {
            const newPath = [...currentPath, i];
            newPaths.push(newPath);
        }
    }

    if (algorithm === "bfs") {
        state.fringe.push(...newPaths);
    } else {
        state.fringe.push(...newPaths.reverse());
    }

    updateVisualization();
    updateExplanation();
}

function initializeState(algo) {
    algorithm = algo;
    state = {
        currentPath: [],
        fringe: [[startNode]],
        expanded: [],
        isGoal: false,
        skippedPath: null
    };
    if (algo === 'bfs') {
        fringeLabel.textContent = "Paths to Explore (Queue):";
    } else {
        fringeLabel.textContent = "Paths to Explore (Stack):";
    }
}

// Event Listeners
startBtn.addEventListener("click", () => {
    initializeState(algoSelect.value);
    drawGraph();
    updateVisualization();
    updateExplanation();
    startBtn.disabled = true;
    nextBtn.disabled = false;
    resetBtn.disabled = false;
});

nextBtn.addEventListener("click", runNextStep);

resetBtn.addEventListener("click", () => {
    initializeState(algoSelect.value);
    drawGraph();
    updateVisualization();
    startBtn.disabled = false;
    nextBtn.disabled = true;
    resetBtn.disabled = true;
    currentPathDisplay.textContent = "";
    expandedList.innerHTML = "";
    document.getElementById("fringe-list").innerHTML = "";
    stepExplanation.innerHTML = `Choose an exploration style and click 'Start' to begin.`;
});

// Initial setup
document.addEventListener("DOMContentLoaded", () => {
    if (matrix) {
        drawGraph();
    } else {
        document.body.innerHTML = `<h1>Map Not Found!</h1><p>Please go back to the <a href="graph-input2.html">previous page</a> to create a map first.</p>`;
    }
    stepExplanation.innerHTML = `Choose an exploration style and click 'Start' to begin.`;
});