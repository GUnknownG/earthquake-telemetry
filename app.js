import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Database Configuration (Gamit ang iyong Firebase credentials)
const firebaseConfig = {
  apiKey: "AIzaSyAk4eysZXqS89PMv5khnaBdzCxIDQJUm4A",
  authDomain: "mimic-3949d.firebaseapp.com",
  projectId: "mimic-3949d",
  storageBucket: "mimic-3949d.appfirebasestorage.app",
  messagingSenderId: "342709558534",
  appId: "1:342709558534:web:a3b07db4027d59e02d9287"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global variables
let globalEntries = [];
let showAllGraph = false;

// 1. Navigation Logic
window.navigateTo = function(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
  document.getElementById(pageId).classList.add('active-page');
};

// 2. Modal Logic
window.toggleModal = function(show) {
  document.getElementById('historyModal').style.display = show ? 'flex' : 'none';
};

// 3. Toggle Graph View Mode
window.toggleGraphView = function() {
  showAllGraph = !showAllGraph;
  const btn = document.getElementById('toggleGraphBtn');
  const title = document.getElementById('graphTitle');
  
  if (showAllGraph) {
    btn.textContent = "Show Latest 20";
    title.textContent = "Showing: All Records";
  } else {
    btn.textContent = "View All Record";
    title.textContent = "Showing: Latest 20 Records";
  }
  renderChartAndTable();
};

// 4. Chart Initialization
const ctx = document.getElementById('quakeChart').getContext('2d');
const quakeChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Magnitude History',
      data: [],
      borderColor: '#ff4757',
      backgroundColor: 'rgba(255, 71, 87, 0.2)',
      fill: true,
      tension: 0.3
    }]
  },
  options: { 
    responsive: true,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Magnitude', color: '#fff' }, ticks: { color: '#fff' } },
      x: { title: { display: true, text: 'Timestamp', color: '#fff' }, ticks: { color: '#fff' } }
    },
    plugins: {
      legend: { labels: { color: '#fff' } }
    }
  }
});

// 5. Send Data Logic (Firestore addDoc)
const magInput = document.getElementById('magInput');
document.getElementById('sendBtn').addEventListener('click', async () => {
  const val = parseFloat(magInput.value);
  if (isNaN(val) || val <= 0) return alert("Please enter a valid magnitude!");

  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  try {
    await addDoc(collection(db, "earthquake_logs"), {
      magnitude: val,
      timestamp: timestamp,
      created_at: now.getTime() // Gagamitin natin ito para sa Firestore TTL
    });
    magInput.value = '';
  } catch (error) {
    console.error("Error adding document: ", error);
  }
});

// 6. Update Status Light Indicator
function updateIndicators(latestMag) {
  const white = document.getElementById('whiteCard');
  const green = document.getElementById('greenCard');
  const yellow = document.getElementById('yellowCard');
  const red = document.getElementById('redCard');

  [white, green, yellow, red].forEach(c => c.classList.remove('active-indicator'));

  if (latestMag >= 0.1 && latestMag <= 3.9) {
    white.classList.add('active-indicator');
  } else if (latestMag >= 4.0 && latestMag <= 4.9) {
    green.classList.add('active-indicator');
  } else if (latestMag >= 5.0 && latestMag <= 5.9) {
    yellow.classList.add('active-indicator');
  } else if (latestMag >= 6.0) {
    red.classList.add('active-indicator');
  }
}

// 7. Render Function
function renderChartAndTable() {
  const labels = [];
  const magnitudes = [];
  const tableBody = document.getElementById('historyTableBody');
  tableBody.innerHTML = '';

  if (globalEntries.length > 0) {
    globalEntries.forEach(item => {
      const row = `<tr><td>${item.timestamp}</td><td>${item.magnitude}</td></tr>`;
      tableBody.innerHTML = row + tableBody.innerHTML;
    });

    const chartEntries = showAllGraph ? globalEntries : globalEntries.slice(-20);

    chartEntries.forEach(item => {
      labels.push(item.timestamp);
      magnitudes.push(item.magnitude);
    });

    const lastEntry = globalEntries[globalEntries.length - 1];
    updateIndicators(lastEntry.magnitude);
  }

  quakeChart.data.labels = labels;
  quakeChart.data.datasets[0].data = magnitudes;
  quakeChart.update();
}

// 8. Real-time Firestore Sync Listener (onSnapshot)
const q = query(collection(db, "earthquake_logs"), orderBy("created_at", "asc"));
onSnapshot(q, (snapshot) => {
  globalEntries = [];
  snapshot.forEach((doc) => {
    globalEntries.push(doc.data());
  });
  renderChartAndTable();
});