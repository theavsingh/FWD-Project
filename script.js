document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    restoreState();
    initWhiteboard();
    setInterval(updateCountdowns, 1000);
    initCommandPalette();
});

function restoreState() {
    loadTasks();
    loadExams();
    loadSpots();
    loadVault();
    loadGallery();
    
    // Restore Pomodoro Stats
    const today = new Date().toDateString();
    let stats = JSON.parse(localStorage.getItem('studyStats') || '{"date": "", "cycles": 0}');
    if (stats.date !== today) stats = { date: today, cycles: 0 };
    localStorage.setItem('studyStats', JSON.stringify(stats));
    document.getElementById('cycle-count').innerText = stats.cycles;

    const savedTab = localStorage.getItem('activeStudyTab') || 'planner';
    switchTab(savedTab);
}

function initCommandPalette() {
    const modal = document.getElementById('cmd-palette');
    const input = document.getElementById('cmd-input');

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
            if (modal.style.display === 'flex') input.focus();
        }
        if (e.key === 'Escape') modal.style.display = 'none';
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if(!val) return;
            
            if(val.startsWith('/vault')) {
                const parts = val.replace('/vault ', '').split(' ');
                const url = parts.pop();
                saveToVault(parts.join(' ') || 'Quick Link', url);
            } else if (val.startsWith('/spot')) {
                const name = val.replace('/spot ', '');
                saveSpot(name, 'Quick Entry');
            } else {
                saveTask(val);
            }
            
            input.value = '';
            modal.style.display = 'none';
        }
    });
}

let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;
let currentMode = 25;

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('pomodoro-time').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isTimerRunning = false;
            
            if (currentMode === 25) {
                let stats = JSON.parse(localStorage.getItem('studyStats'));
                stats.cycles += 1;
                localStorage.setItem('studyStats', JSON.stringify(stats));
                document.getElementById('cycle-count').innerText = stats.cycles;
                alert("Focus cycle complete! Taking a short break.");
                setTimerMode(5);
                startTimer();
            } else {
                alert("Break over. Back to work.");
                setTimerMode(25);
            }
        }
    }, 1000);
}

function pauseTimer() { clearInterval(timerInterval); isTimerRunning = false; }
function resetTimer() { pauseTimer(); timeLeft = currentMode * 60; updateTimerDisplay(); }
function setTimerMode(minutes) { pauseTimer(); currentMode = minutes; timeLeft = minutes * 60; updateTimerDisplay(); }

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    if (username) {
        localStorage.setItem('studyFlowUser', username);
        checkLogin();
    }
});

function checkLogin() {
    const user = localStorage.getItem('studyFlowUser');
    if (user) {
        document.getElementById('display-name').textContent = user;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-dashboard').style.display = 'block';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const tabElement = document.getElementById(tabName + '-tab');
    if(tabElement) tabElement.classList.add('active');
    
    const btnElement = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if(btnElement) btnElement.classList.add('active');

    localStorage.setItem('activeStudyTab', tabName);
    if (tabName === 'gallery') setTimeout(resizeCanvas, 50);
}

function addTask() {
    const input = document.getElementById('task-input');
    if (input.value.trim()) saveTask(input.value.trim());
    input.value = '';
}

function saveTask(text) {
    const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks.push({ text, completed: false, id: Date.now() });
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    loadTasks();
}

function loadTasks() {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        li.innerHTML = `
            <span onclick="toggleTask(${task.id})" style="cursor:pointer; flex:1;">
                ${task.completed ? '✓' : '○'} &nbsp; ${task.text}
            </span>
            <button class="delete-btn" onclick="deleteTask(${task.id})">Del</button>
        `;
        list.appendChild(li);
    });
}

function toggleTask(id) {
    const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    const task = tasks.find(t => t.id === id);
    if(task) task.completed = !task.completed;
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    loadTasks();
}

function deleteTask(id) {
    let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    loadTasks();
}

function addVaultItem() {
    const name = document.getElementById('vault-name').value.trim();
    const url = document.getElementById('vault-url').value.trim();
    if(name && url) saveToVault(name, url);
    document.getElementById('vault-name').value = '';
    document.getElementById('vault-url').value = '';
}

function saveToVault(name, url) {
    let finalUrl = url.startsWith('http') ? url : 'https://' + url;
    const vault = JSON.parse(localStorage.getItem('studyVault') || '[]');
    vault.push({ name, url: finalUrl, id: Date.now() });
    localStorage.setItem('studyVault', JSON.stringify(vault));
    loadVault();
}

function loadVault() {
    const list = document.getElementById('vault-list');
    list.innerHTML = '';
    const vault = JSON.parse(localStorage.getItem('studyVault') || '[]');
    vault.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%">
                <strong>${item.name}</strong>
                <button class="delete-btn" onclick="deleteVault(${item.id})">Del</button>
            </div>
            <a href="${item.url}" target="_blank" class="vault-link">${item.url}</a>
        `;
        list.appendChild(li);
    });
}

function deleteVault(id) {
    let vault = JSON.parse(localStorage.getItem('studyVault') || '[]');
    vault = vault.filter(v => v.id !== id);
    localStorage.setItem('studyVault', JSON.stringify(vault));
    loadVault();
}

function addExam() {
    const name = document.getElementById('exam-name').value;
    const date = document.getElementById('exam-date').value;
    if (name && date) {
        const exams = JSON.parse(localStorage.getItem('studyExams') || '[]');
        exams.push({ name, date, id: Date.now() });
        localStorage.setItem('studyExams', JSON.stringify(exams));
        document.getElementById('exam-name').value = '';
        document.getElementById('exam-date').value = '';
        loadExams();
    }
}

function loadExams() {
    const container = document.getElementById('countdown-container');
    container.innerHTML = '';
    const exams = JSON.parse(localStorage.getItem('studyExams') || '[]');
    exams.forEach(exam => {
        const div = document.createElement('div');
        div.className = 'countdown-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h3>${exam.name}</h3>
                <button class="delete-btn" onclick="deleteExam(${exam.id})">✕</button>
            </div>
            <small style="color:var(--text-muted)">${exam.date}</small>
            <div class="timer" id="timer-${exam.id}">...</div>
        `;
        container.appendChild(div);
    });
    updateCountdowns();
}

function deleteExam(id) {
    let exams = JSON.parse(localStorage.getItem('studyExams') || '[]');
    exams = exams.filter(e => e.id !== id);
    localStorage.setItem('studyExams', JSON.stringify(exams));
    loadExams();
}

function updateCountdowns() {
    const exams = JSON.parse(localStorage.getItem('studyExams') || '[]');
    const now = new Date().getTime();
    
    exams.forEach(exam => {
        const el = document.getElementById(`timer-${exam.id}`);
        if(el) {
            const examDate = new Date(exam.date).getTime();
            const diff = examDate - now;
            if (diff < 0) el.innerText = "DONE";
            else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                el.innerText = `${d}d ${h}h Left`;
            }
        }
    });
}

function addSpot() {
    const name = document.getElementById('spot-name').value.trim();
    const type = document.getElementById('spot-type').value;
    if (name) saveSpot(name, type);
    document.getElementById('spot-name').value = '';
}

function saveSpot(name, type) {
    const spots = JSON.parse(localStorage.getItem('studySpots') || '[]');
    spots.push({ name, type, id: Date.now() });
    localStorage.setItem('studySpots', JSON.stringify(spots));
    loadSpots();
}

function loadSpots() {
    const list = document.getElementById('spot-list');
    list.innerHTML = '';
    const spots = JSON.parse(localStorage.getItem('studySpots') || '[]');
    spots.forEach(spot => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong style="color:var(--accent)">${spot.type}:</strong> ${spot.name}</span>
            <button class="delete-btn" onclick="deleteSpot(${spot.id})">Del</button>
        `;
        list.appendChild(li);
    });
}

function deleteSpot(id) {
    let spots = JSON.parse(localStorage.getItem('studySpots') || '[]');
    spots = spots.filter(s => s.id !== id);
    localStorage.setItem('studySpots', JSON.stringify(spots));
    loadSpots();
}

let isDrawing = false;
let ctx;
let canvas;

function initWhiteboard() {
    canvas = document.getElementById('whiteboard');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseout', stopDraw);
    
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    
    window.addEventListener('resize', () => {
        if (document.getElementById('gallery-tab').classList.contains('active')) resizeCanvas();
    });
}

function resizeCanvas() {
    if (!canvas || !ctx) return;
    
    // Remember current content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

    // Resize
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Style & Restore
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    // Check local storage on initial run, otherwise use temp canvas
    const savedImg = localStorage.getItem('studyWhiteboardCanvas');
    if (savedImg && tempCanvas.width === 0) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = savedImg;
    } else {
        ctx.drawImage(tempCanvas, 0, 0);
    }
}

function startDraw(e) { isDrawing = true; draw(e); }

function stopDraw() { 
    if(!isDrawing) return;
    isDrawing = false; 
    ctx.beginPath(); 
    autoSaveCanvas();
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function clearBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem('studyWhiteboardCanvas');
}

function autoSaveCanvas() {
    localStorage.setItem('studyWhiteboardCanvas', canvas.toDataURL("image/png"));
}

function saveBoardToGallery() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = '#09090b'; // Fill dark background
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvas, 0, 0);
    saveImageToLocal(tempCanvas.toDataURL("image/png"));
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => saveImageToLocal(e.target.result);
        reader.readAsDataURL(file);
    }
}

function saveImageToLocal(src) {
    let images = JSON.parse(localStorage.getItem('studyGallery') || '[]');
    images.unshift(src); // Add to top
    if (images.length > 20) images.pop();
    localStorage.setItem('studyGallery', JSON.stringify(images));
    loadGallery();
}

function loadGallery() {
    const gallery = document.getElementById('image-gallery');
    gallery.innerHTML = '';
    const images = JSON.parse(localStorage.getItem('studyGallery') || '[]');
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'gallery-img';
        gallery.appendChild(img);
    });
}

function clearGallery() {
    localStorage.removeItem('studyGallery');
    loadGallery();
}