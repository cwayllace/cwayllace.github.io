// graph.js

// Read the adjacency matrix from checkboxes and store it
function saveMatrixFromForm(size = 5) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else {
                const cell = document.getElementById(`cell-${i}-${j}`);
                matrix[i][j] = cell.checked ? 1 : 0;
            }
        }
    }
    localStorage.setItem('adjacencyMatrix', JSON.stringify(matrix));
    return matrix;
}

// Retrieve stored matrix
function loadMatrix() {
    const matrix = localStorage.getItem('adjacencyMatrix');
    return matrix ? JSON.parse(matrix) : null;
}

// DFS traversal
function dfs(matrix, startNode = 0) {
    const visited = new Array(matrix.length).fill(false);
    const result = [];
    const stack = [startNode];

    while (stack.length > 0) {
        const node = stack.pop();
        if (!visited[node]) {
            visited[node] = true;
            result.push(node);
            // Push neighbors in reverse order for consistent left-to-right traversal
            for (let i = matrix[node].length - 1; i >= 0; i--) {
                if (matrix[node][i] === 1 && !visited[i]) {
                    stack.push(i);
                }
            }
        }
    }

    return result;
}

// BFS traversal
function bfs(matrix, startNode = 0) {
    const visited = new Array(matrix.length).fill(false);
    const result = [];
    const queue = [startNode];
    visited[startNode] = true;

    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);
        for (let i = 0; i < matrix[node].length; i++) {
            if (matrix[node][i] === 1 && !visited[i]) {
                visited[i] = true;
                queue.push(i);
            }
        }
    }

    return result;
}

// Animate traversal (placeholder: print one step per second)
function animateTraversal(nodes, updateCallback, doneCallback) {
    let index = 0;
    const interval = setInterval(() => {
        if (index < nodes.length) {
            updateCallback(nodes[index]);
            index++;
        } else {
            clearInterval(interval);
            if (doneCallback) doneCallback();
        }
    }, 1000); // 1 second per step
}

function updateFringeDisplay() {
    const fringeList = document.getElementById("fringe-list");
    fringeList.innerHTML = "";

    if (fringe.length === 0) {
        const li = document.createElement("li");
        li.textContent = "(empty)";
        fringeList.appendChild(li);
    } else {
        fringe.forEach(index => {
            const li = document.createElement("li");
            li.textContent = cityNames[index]; // use names not numbers
            fringeList.appendChild(li);
        });
    }
}
