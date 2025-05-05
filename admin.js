// Admin Dashboard JS
document.addEventListener('DOMContentLoaded', () => {
  fetchVendorToDistributorQR();
  fetchSalesData();
  fetchAdminToVendorQR();
  fetchComplaints(); // Added to load complaints on initial page load
});
// Add this debugging code to your admin.js file
// Just after document.addEventListener('DOMContentLoaded', ...)
// Call this with debugVendorNames() in the console

async function debugVendorNames() {
  console.group('🔍 DEBUGGING VENDOR NAMES');
  try {
    // 1. First get the QR assignments
    console.log('Fetching QR assignments...');
    const assignmentsRes = await axiosInstance.get('/api/qr-assignment/admin-to-vendor');
    const assignments = assignmentsRes.data;
    
    if (!assignments || !assignments.length) {
      console.log('No QR assignments found.');
      return;
    }
    
    console.log(`Found ${assignments.length} QR assignments`);
    
    // 2. Extract and log all vendorIds
    const vendorIds = assignments.map(a => a.vendorId).filter(Boolean);
    console.log('Vendor IDs in QR assignments:', vendorIds);
    
    // 3. Get detailed debug info for each vendor
    for (const vendorId of vendorIds.slice(0, 3)) { // Limit to first 3 to avoid too many requests
      console.group(`Testing vendorId: ${vendorId}`);
      try {
        const vendorRes = await axiosInstance.get(`/api/admin-dashboard/debug-vendor/${vendorId}`);
        console.log('Vendor lookup result:', vendorRes.data);
      } catch (err) {
        console.error('Vendor lookup failed:', err.response?.data || err.message);
      }
      console.groupEnd();
    }
  } catch (err) {
    console.error('Debug error:', err);
  }
  console.groupEnd();
}

// Call this to fix vendor names once you've identified the issue
async function fixVendorNames() {
  try {
    const response = await axiosInstance.post('/api/admin-dashboard/fix-vendor-names');
    console.log('Fix result:', response.data);
    alert('Vendor names have been fixed. Refreshing data...');
    fetchAdminToVendorQR();
  } catch (err) {
    console.error('Fix error:', err);
    alert('Error fixing vendor names: ' + (err.response?.data?.message || err.message));
  }
}

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to all requests
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Intercept responses
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      alert("Session expired. Logging you out...");
      localStorage.removeItem('adminToken');
      window.location.href = "login.html";
    }
    return Promise.reject(error);
  }
);

function openTab(evt, tabId) {
  const tabContents = document.querySelectorAll('.tab-content');
  const tabs = document.querySelectorAll('.tab');

  tabContents.forEach(content => content.classList.remove('active'));
  tabs.forEach(tab => tab.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  evt.currentTarget.classList.add('active');

  switch (tabId) {
    case 'salesDataTab':
      fetchSalesData();
      break;
    case 'pendingPaymentsTab':
      fetchPendingPayments();
      break;
    case 'confirmedPaymentsTab':
      fetchConfirmedPayments();
      break;
    case 'complaintsTab':
      fetchComplaints();
      break;
    case 'analyticsTab':
      fetchDashboardStats();
      break;
    case 'qrAssignmentTab':
      fetchVendorToDistributorQR();
      fetchAdminToVendorQR(); 
      break;
  }
}

async function assignQR() {
  const vendorId = document.getElementById('vendorId').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value);
  const qrStartInput = document.getElementById('qrStartInput').value.trim();
  const qrEndInput = document.getElementById('qrEndInput').value.trim();

  if (!vendorId || !quantity || !qrStartInput || !qrEndInput) {
    return alert("All fields are required.");
  }

  const startNum = parseInt(qrStartInput.replace('PROD', ''), 10);
  const endNum = parseInt(qrEndInput.replace('PROD', ''), 10);
  const expectedEndNum = startNum + quantity - 1;
  const expectedEndQR = `PROD${expectedEndNum.toString().padStart(5, '0')}`;

  if (qrEndInput !== expectedEndQR) {
    return alert(`❌ Wrong QR End. It should be ${expectedEndQR}`);
  }

  try {
    await axiosInstance.post("/api/qr-assignment/assign-qr", {
      vendorId,
      quantity,
      qrStart: qrStartInput,
      qrEnd: qrEndInput
    });

    alert("QR assigned successfully!");
    resetForm();
    fetchVendorToDistributorQR();
    fetchAdminToVendorQR();
  } catch (error) {
    console.error("Error assigning QR:", error);
    alert(error.response?.data?.message || "Failed to assign QR.");
  }
}

// Pagination variables for all tabs
let adminData = [];
let distributorData = [];
let complaintsData = []; // Added for complaints pagination
let adminCurrentPage = 1;
let distributorCurrentPage = 1;
let currentSalesPage = 1;
let currentComplaintsPage = 1; // Added for complaints pagination
const rowsPerPage = 10;
const salesItemsPerPage = 10;
const complaintsItemsPerPage = 10; // Added for complaints pagination

// ✅ FIXED: Admin → Vendor QR fetching function with pagination
async function fetchAdminToVendorQR() {
  try {
    const res = await axiosInstance.get("/api/qr-assignment/admin-to-vendor");
    
    // Debug: Check what's coming from the server
    console.log("Admin to Vendor QR data:", res.data);
    
    // ✅ FIXED: Map undefined vendor names to "Unknown" for display
    adminData = res.data.map(item => {
      return {
        ...item,
        vendorName: item.vendorName || "Unknown" // Provide a fallback if vendorName is undefined
      };
    });
    
    renderAdminTable();
  } catch (error) {
    console.error("Error fetching Admin→Vendor QR:", error);
  }
}

// Vendor → Distributor QR fetching function with pagination
async function fetchVendorToDistributorQR() {
  try {
    const res = await axiosInstance.get("/api/qr-assignment/vendor-to-distributor");
    distributorData = res.data;
    renderDistributorTable();
  } catch (error) {
    console.error("Error fetching Vendor→Distributor QR:", error);
  }
}

// Handle Admin Table Render with Edit and Delete buttons
function editQRCode(index) {
  const item = adminData[(adminCurrentPage - 1) * rowsPerPage + index];
  document.getElementById("vendorId").value = item.vendorId;
  document.getElementById("quantity").value = item.quantity;
  document.getElementById("qrStartInput").value = item.qrStart;
  document.getElementById("qrEndInput").value = item.qrEnd;

  const button = document.querySelector(".qr-form button");
  button.innerText = "Update QR";
  button.setAttribute("onclick", `updateQRCode('${item._id}')`);
}

// Update QR Code in the database
async function updateQRCode(qrId) {
  const vendorId = document.getElementById("vendorId").value.trim();
  const quantity = document.getElementById("quantity").value.trim();
  const qrStart = document.getElementById("qrStartInput").value.trim();
  const qrEnd = document.getElementById("qrEndInput").value.trim();

  if (!vendorId || !quantity || !qrStart || !qrEnd) {
    return alert("All fields are required.");
  }

  try {
    await axiosInstance.put(
      `/api/qr-assignment/${qrId}`,
      { vendorId, quantity, qrStart, qrEnd }
    );

    alert("QR updated successfully!");
    fetchAdminToVendorQR();
    resetForm();
  } catch (err) {
    console.error("Update error:", err);
    alert("QR update failed: " + (err.response?.data?.error || "Unknown error"));
  }
}

// Delete QR Code from the database
async function deleteQRCode(qrId) {
  if (!confirm("Are you sure you want to delete this QR?")) return;

  try {
    await axiosInstance.delete(`/api/qr-assignment/${qrId}`);
    alert("QR deleted successfully!");
    fetchAdminToVendorQR();
  } catch (err) {
    console.error("Delete error:", err);
    alert("QR delete failed: " + (err.response?.data?.error || "Unknown error"));
  }
}

// ✅ FIXED: Improved renderAdminTable with error handling for vendor names
function renderAdminTable() {
  const tbody = document.getElementById("adminAssignmentTableBody");
  tbody.innerHTML = "";

  const start = (adminCurrentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = adminData.slice(start, end);

  pageData.forEach((item, index) => {
    // Debug: Check each item before rendering
    console.log(`Rendering item ${index}:`, item);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.vendorId || 'N/A'}</td>
    <!--  <td>${item.vendorName || 'Unknown'}</td>-->
    <!--  <td>${item.vendorPhone || 'N/A'}</td> -->
      <td>${item.qrStart || 'N/A'}</td>
      <td>${item.qrEnd || 'N/A'}</td>
      <td>${item.quantity || '0'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("adminPageInfo").innerText =
    `Page ${adminCurrentPage} of ${Math.max(1, Math.ceil(adminData.length / rowsPerPage))}`;
}


// Reset the form to its default state
function resetForm() {
  document.getElementById("vendorId").value = '';
  document.getElementById("quantity").value = '';
  document.getElementById("qrStartInput").value = '';
  document.getElementById("qrEndInput").value = '';

  const button = document.querySelector(".qr-form button");
  button.innerText = "Assign QR";
  button.setAttribute("onclick", "assignQR()");
}

function renderDistributorTable() {
  const tbody = document.getElementById("distributorAssignmentTableBody");
  tbody.innerHTML = "";

  const start = (distributorCurrentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = distributorData.slice(start, end);

  pageData.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.vendorName || 'N/A'}</td>
      <td>${item.vendorId || 'N/A'}</td>
      <td>${item.distributorId || '-'}</td>
      <td>${item.distributorName || '-'}</td>
      <td>${item.qrStart || '-'}</td>
      <td>${item.qrEnd || '-'}</td>
      <td>${item.quantity || '0'}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("distributorPageInfo").innerText =
    `Page ${distributorCurrentPage} of ${Math.max(1, Math.ceil(distributorData.length / rowsPerPage))}`;
}

// Pagination Controls for Admin
function nextAdminPage() {
  const totalPages = Math.ceil(adminData.length / rowsPerPage);
  if (adminCurrentPage < totalPages) {
    adminCurrentPage++;
    renderAdminTable();
  }
}

function prevAdminPage() {
  if (adminCurrentPage > 1) {
    adminCurrentPage--;
    renderAdminTable();
  }
}

// Pagination Controls for Distributor
function nextDistributorPage() {
  const totalPages = Math.ceil(distributorData.length / rowsPerPage);
  if (distributorCurrentPage < totalPages) {
    distributorCurrentPage++;
    renderDistributorTable();
  }
}

function prevDistributorPage() {
  if (distributorCurrentPage > 1) {
    distributorCurrentPage--;
    renderDistributorTable();
  }
}

// Sales data functions
async function fetchSalesData() {
  try {
    const res = await axiosInstance.get("/api/admin-dashboard/sales-data");
    const tbody = document.getElementById("salesDataTableBody");
    tbody.innerHTML = "";

    const sortedData = res.data.sort((a, b) => {
      if (a.status === 'pending' && b.status === 'confirmed') return -1;
      if (a.status === 'confirmed' && b.status === 'pending') return 1;
      return new Date(b.date) - new Date(a.date);
    });

    const startIdx = (currentSalesPage - 1) * salesItemsPerPage;
    const endIdx = currentSalesPage * salesItemsPerPage;
    const paginatedData = sortedData.slice(startIdx, endIdx);

    paginatedData.forEach(item => {
      const isConfirmed = item.status === 'confirmed';
      const statusText = isConfirmed ? '✅ Confirmed' : 'Pending';
      const statusClass = isConfirmed ? 'status-confirmed' : 'status-pending';

      const row = document.createElement("tr");
      // In admin.js fetchSalesData function
// Ensure this line uses the correct field name
      row.innerHTML = `
      <td>${new Date(item.date).toLocaleDateString()}</td>
      <td>${item.productId || '-'}</td>
      <td>${item.salespersonId}</td>
      <td>${item.staffName || item.salespersonName || 'Unknown'}</td>  <!-- Use both field names for compatibility -->
      <td>${item.salespersonPhone || item.staffPhoneNumber || '-'}</td>
      <td>${item.stoveOrderId || '-'}</td>
      <td>1</td>
      <td>₹${item.amount || ''}</td>
      <td>${item.upiTransactionId || '-'}</td>
      <td class="${statusClass}">${statusText}</td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationControl(sortedData.length);
  } catch (error) {
    console.error("Error fetching sales data:", error);
  }
}

function updatePaginationControl(totalItems) {
  const totalPages = Math.ceil(totalItems / salesItemsPerPage);
  const pageInfo = document.getElementById("salesPageInfo");
  pageInfo.textContent = `Page ${currentSalesPage} of ${Math.max(1, totalPages)}`;

  const prevBtn = document.getElementById("salesPrevBtn");
  const nextBtn = document.getElementById("salesNextBtn");

  prevBtn.disabled = currentSalesPage === 1;
  nextBtn.disabled = currentSalesPage === totalPages;
}

function prevSalesPage() {
  if (currentSalesPage > 1) {
    currentSalesPage--;
    fetchSalesData();
  }
}

function nextSalesPage() {
  currentSalesPage++;
  fetchSalesData();
}

// Complaints functions with pagination
async function fetchComplaints() {
  try {
    const res = await axiosInstance.get("/api/admin/complaints");
    complaintsData = res.data;
    renderComplaintsTable();
  } catch (error) {
    console.error("Error fetching complaints:", error);
  }
}

// Render complaints table with pagination
function renderComplaintsTable() {
  const tbody = document.getElementById("complaintsTableBody");
  tbody.innerHTML = "";

  const start = (currentComplaintsPage - 1) * complaintsItemsPerPage;
  const end = start + complaintsItemsPerPage;
  const pageData = complaintsData.slice(start, end);

  pageData.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(item.date).toLocaleDateString()}</td>
      <td>${item.salespersonId || '-'}</td>
      <td>${item.salespersonNumber || '-'}</td>
      <td>${item.productId || '-'}</td>
      <td>${item.issue || '-'}</td>
    `;
    tbody.appendChild(row);
  });

  // Update pagination info
  updateComplaintsPaginationControl();
}

// Update complaints pagination controls
function updateComplaintsPaginationControl() {
  const totalPages = Math.ceil(complaintsData.length / complaintsItemsPerPage);
  const pageInfo = document.getElementById("complaintsPageInfo");
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentComplaintsPage} of ${Math.max(1, totalPages)}`;
  }

  // Update button states
  const prevBtn = document.getElementById("complaintsPrevBtn");
  const nextBtn = document.getElementById("complaintsNextBtn");

  if (prevBtn && nextBtn) {
    prevBtn.disabled = currentComplaintsPage === 1;
    nextBtn.disabled = currentComplaintsPage === totalPages || totalPages === 0;
  }
}

// Complaints pagination navigation
function prevComplaintsPage() {
  if (currentComplaintsPage > 1) {
    currentComplaintsPage--;
    renderComplaintsTable();
  }
}

function nextComplaintsPage() {
  const totalPages = Math.ceil(complaintsData.length / complaintsItemsPerPage);
  if (currentComplaintsPage < totalPages) {
    currentComplaintsPage++;
    renderComplaintsTable();
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = "login.html";
}

// Global Search Function for Admin
async function performGlobalSearch() {
  const query = document.getElementById('globalSearchInput').value.trim();
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '';

  if (!query) {
    alert("Please enter a search term.");
    return;
  }

  try {
    const res = await axiosInstance.get(
      `/api/admin-dashboard/global-search?query=${encodeURIComponent(query)}`
    );

    const results = res.data;
    if (!results.length) {
      resultsDiv.innerHTML = "<p>No matching records found.</p>";
      return;
    }

    const grouped = results.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item.data);
      return acc;
    }, {});

    let html = `<h3>🔍 Search Results</h3>`;

    ['User', 'Vendor'].forEach(type => {
      if (grouped[type]) {
        html += `<h4>${type}s</h4>`;
        html += `
          <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Distributor ID</th></tr></thead>
              <tbody>`;
              grouped[type].forEach(entry => {
                html += `<tr>
                  <td>${entry.name || '-'}</td>
                  <td>${entry.email || '-'}</td>
                  <td>${entry.phone || '-'}</td>
                  <td>${entry.role || '-'}</td>
                  <td>${entry.distributorId || '-'}</td>
                </tr>`;
              });

        html += `</tbody></table>`;
      }
    });

    if (grouped['Sale']) {
      html += `<h4>Sales</h4>`;
      html += `
        <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead><tr><th>Product ID</th><th>Salesperson ID</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>`;
      grouped['Sale'].forEach(entry => {
        html += `<tr>
          <td>${entry.stoveOrderId || '-'}</td>
          <td>${entry.deliveryStaffId || '-'}</td>
          <td>${entry.amount || '-'}</td>
          <td>${entry.isConfirmed ? '✅ Confirmed' : 'Pending'}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }

    if (grouped['QRAssignment']) {
      html += `<h4>QR Assignments</h4>`;
      html += `
        <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead><tr><th>Assigned By</th><th>Vendor ID</th><th>Distributor ID</th><th>Start</th><th>End</th><th>Qty</th></tr></thead>
          <tbody>`;
      grouped['QRAssignment'].forEach(entry => {
        html += `<tr>
          <td>${entry.assignedBy}</td>
          <td>${entry.vendorId || '-'}</td>
          <td>${entry.distributorId || '-'}</td>
          <td>${entry.qrStart}</td>
          <td>${entry.qrEnd}</td>
          <td>${entry.quantity}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }

    resultsDiv.innerHTML = html;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      resultsDiv.innerHTML = '';
    }, 5000);

  } catch (error) {
    console.error('Search Error:', error);
    resultsDiv.innerHTML = "<p style='color: red;'>Failed to perform search.</p>";
  }
}