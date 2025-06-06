class PomodoroTimer {
    constructor() {
        // Add loading screen
        this.addLoadingScreen();

        // Timer settings
        this.workTime = 25 * 60;
        this.shortBreakTime = 5 * 60;
        this.longBreakTime = 10 * 60;  // 10 minutes for long break
        this.sessionsBeforeLongBreak = 4;  // Number of work sessions before long break
        this.completedSessions = 0;  // Track completed work sessions
        this.currentTime = this.workTime;
        this.isWorkMode = true;
        this.isRunning = false;
        this.timerId = null;
        this.lastTimestamp = null;

        // Theme settings
        this.themes = {};
        this.currentTheme = 'default';

        // DOM elements
        this.timerDisplay = document.getElementById('timer');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.playPauseBtn = document.getElementById('playPause');
        this.resetBtn = document.getElementById('reset');
        this.settingsBtn = document.getElementById('settings');
        this.progressRing = document.querySelector('.progress-ring__circle');
        this.container = document.querySelector('.container');
        
        // Settings modal elements
        this.modal = document.getElementById('settingsModal');
        this.closeModal = document.querySelector('.close-modal');
        this.themeSelect = document.getElementById('themeSelect');

        // Calculate circle properties
        this.circumference = 2 * Math.PI * 90;
        this.progressRing.style.strokeDasharray = `${this.circumference}`;
        this.updateProgress(1);

        // Load themes and initialize
        this.loadThemes().then(() => {
            // Initialize theme from saved preference
            this.initializeTheme();
            
            // Restore timer state
            this.restoreTimerState();
            
            // Event listeners
            this.playPauseBtn.addEventListener('click', () => this.toggleTimer());
            this.resetBtn.addEventListener('click', () => this.resetTimer());
            this.settingsBtn.addEventListener('click', () => this.openSettings());
            this.closeModal.addEventListener('click', () => this.closeSettings());
            this.themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));

            // Close modal when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeSettings();
                }
            });

            // Save timer state before page unload
            window.addEventListener('beforeunload', () => this.saveTimerState());

            // Initial display
            this.updateDisplay();
            
            // Remove loading screen
            this.removeLoadingScreen();

            // Resume timer if it was running
            if (this.isRunning) {
                this.startTimer();
            }
        });
    }

    addLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loadingScreen);
    }

    removeLoadingScreen() {
        // Add loaded class to body
        document.body.classList.add('loaded');
        
        // Hide loading screen with animation
        const loadingScreen = document.querySelector('.loading-screen');
        loadingScreen.classList.add('hidden');
        
        // Remove loading screen after animation
        setTimeout(() => {
            loadingScreen.remove();
        }, 300);
    }

    async loadThemes() {
        try {
            const response = await fetch('themes.json');
            this.themes = await response.json();
            this.populateThemeSelect();

            // Preload theme images
            await Promise.all(
                Object.values(this.themes).map(theme => {
                    if (theme.featureImage) {
                        return new Promise((resolve) => {
                            const img = new Image();
                            img.onload = resolve;
                            img.onerror = resolve; // Continue even if image fails to load
                            img.src = theme.featureImage;
                        });
                    }
                    return Promise.resolve();
                })
            );
        } catch (error) {
            console.error('Error loading themes:', error);
        }
    }

    populateThemeSelect() {
        this.themeSelect.innerHTML = Object.entries(this.themes)
            .map(([value, theme]) => `<option value="${value}">${theme.name}</option>`)
            .join('');
    }

    openSettings() {
        this.modal.style.display = 'block';
    }

    closeSettings() {
        this.modal.style.display = 'none';
    }

    changeTheme(themeName) {
        // Remove all theme classes first
        document.body.classList.remove('theme-default', 'theme-dark', 'theme-nature', 'theme-ocean');
        
        // Add new theme class
        document.body.classList.add(`theme-${themeName}`);
        
        // Store current theme
        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        
        // Update feature image if it exists
        const featureImage = document.querySelector('.feature-image');
        if (featureImage && theme.featureImage) {
            featureImage.src = theme.featureImage;
        }

        // Save theme preference
        localStorage.setItem('selectedTheme', themeName);
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('selectedTheme');
        if (savedTheme && this.themes[savedTheme]) {
            this.changeTheme(savedTheme);
            if (this.themeSelect) {
                this.themeSelect.value = savedTheme;
            }
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.lastTimestamp = Date.now();
        
        this.timerId = setInterval(() => {
            this.currentTime--;
            this.saveTimerState();
            
            if (this.currentTime <= 0) {
                this.switchMode();
            }
            
            this.updateDisplay();
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(this.timerId);
        this.saveTimerState();
    }

    resetTimer() {
        this.pauseTimer();
        this.isWorkMode = true;
        this.currentTime = this.workTime;
        this.completedSessions = 0;  // Reset session count
        this.container.classList.remove('rest-mode');
        this.updateDisplay();
        this.saveTimerState();
    }

    switchMode() {
        this.isWorkMode = !this.isWorkMode;
        
        if (this.isWorkMode) {
            this.currentTime = this.workTime;
        } else {
            // Increment completed sessions when switching to break mode
            if (this.isWorkMode === false) {
                this.completedSessions++;
            }
            
            // Determine if it's time for a long break
            if (this.completedSessions % this.sessionsBeforeLongBreak === 0) {
                this.currentTime = this.longBreakTime;
            } else {
                this.currentTime = this.shortBreakTime;
            }
        }

        this.container.classList.toggle('rest-mode');
        this.saveTimerState();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update mode indicator with session information
        if (this.isWorkMode) {
            this.modeIndicator.textContent = `Work Time (${this.completedSessions + 1}/4)`;
        } else {
            const isLongBreak = this.completedSessions % this.sessionsBeforeLongBreak === 0;
            this.modeIndicator.textContent = isLongBreak ? 'Long Break (10min)' : 'Short Break (5min)';
        }
        
        this.updateProgress(this.currentTime / (this.isWorkMode ? this.workTime : 
            (this.completedSessions % this.sessionsBeforeLongBreak === 0 ? this.longBreakTime : this.shortBreakTime)));
    }

    updateProgress(progress) {
        const offset = this.circumference * (1 - progress);
        this.progressRing.style.strokeDashoffset = offset;
    }

    saveTimerState() {
        const timerState = {
            currentTime: this.currentTime,
            isWorkMode: this.isWorkMode,
            isRunning: this.isRunning,
            lastTimestamp: Date.now(),
            completedSessions: this.completedSessions  // Save completed sessions
        };
        localStorage.setItem('timerState', JSON.stringify(timerState));
    }

    restoreTimerState() {
        const savedState = localStorage.getItem('timerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Calculate elapsed time since last save
            const now = Date.now();
            const elapsed = state.lastTimestamp ? Math.floor((now - state.lastTimestamp) / 1000) : 0;
            
            this.isWorkMode = state.isWorkMode;
            this.isRunning = state.isRunning;
            this.completedSessions = state.completedSessions || 0;  // Restore completed sessions
            
            // Update current time accounting for elapsed time
            if (this.isRunning && elapsed > 0) {
                this.currentTime = Math.max(0, state.currentTime - elapsed);
                
                // Switch modes if timer expired during absence
                if (this.currentTime === 0) {
                    this.switchMode();
                }
            } else {
                this.currentTime = state.currentTime;
            }
            
            // Update play/pause button
            this.playPauseBtn.innerHTML = this.isRunning ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
            
            // Update container class for mode
            this.container.classList.toggle('rest-mode', !this.isWorkMode);
        }
    }
}

class TodoList {
    constructor() {
        this.todos = [];
        this.input = document.getElementById('todoInput');
        this.list = document.getElementById('todoList');
        this.addButton = document.getElementById('addTodo');
        this.todoWindow = document.querySelector('.todo-window');
        
        this.setupEventListeners();
        this.loadTodos();
        this.render();
    }
    
    setupEventListeners() {
        this.addButton.addEventListener('click', () => this.addTodo());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });
        
        // Make window draggable
        const header = this.todoWindow.querySelector('.window-header');
        this.makeDraggable(header);
    }
    
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown.bind(this);
        
        function dragMouseDown(e) {
            e.preventDefault();
            // Get the current computed position before starting the drag
            const rect = this.todoWindow.getBoundingClientRect();
            this.todoWindow.style.right = 'auto';
            this.todoWindow.style.left = rect.left + 'px';
            this.todoWindow.style.top = rect.top + 'px';
            
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag.bind(this);
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const window = this.todoWindow;
            window.style.top = (window.offsetTop - pos2) + "px";
            window.style.left = (window.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    addTodo() {
        const text = this.input.value.trim();
        if (text) {
            const todo = {
                id: Date.now(),
                text,
                completed: false,
                timestamp: new Date().toISOString()
            };
            
            this.todos.push(todo);
            this.input.value = '';
            this.saveTodos();
            this.render();
        }
    }
    
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
        }
    }
    
    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
    }
    
    saveTodos() {
        Cookies.set('todos', JSON.stringify(this.todos), { expires: 365 });
    }
    
    loadTodos() {
        const savedTodos = Cookies.get('todos');
        if (savedTodos) {
            try {
                this.todos = JSON.parse(savedTodos);
            } catch (e) {
                console.error('Error loading todos:', e);
                this.todos = [];
            }
        }
    }
    
    render() {
        this.list.innerHTML = '';
        this.todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            
            const checkbox = document.createElement('div');
            checkbox.className = `todo-checkbox${todo.completed ? ' checked' : ''}`;
            checkbox.addEventListener('click', () => this.toggleTodo(todo.id));
            
            const text = document.createElement('span');
            text.className = `todo-text${todo.completed ? ' completed' : ''}`;
            text.textContent = todo.text;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-todo';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
            
            li.appendChild(checkbox);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            this.list.appendChild(li);
        });
    }
}

// Initialize the timer and todo list when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const timer = new PomodoroTimer();
    const todoList = new TodoList();
});