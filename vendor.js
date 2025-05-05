// Pagination variables
let vendorAssignments = [];
let distributorAssignments = [];
let salesData = [];
let currentVendorPage = 1;
let currentDistributorPage = 1;
let currentSalesPage = 1;
const rowsPerPage = 5;

document.addEventListener('DOMContentLoaded', () => {
    fetchVendorData();            // Load dashboard stats
    fetchScannedQRData();         // Load scanned QR info
    fetchQRAssignments();         // Load QR assignments
});

// Axios instance with interceptors
const axiosInstance = axios.create({
    baseURL: 'https://salesapp-backend-1.onrender.com',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add token to all requests
axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('vendorToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Intercept responses for auth errors
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            alert("Session expired. Logging you out...");
            logout();
        }
        return Promise.reject(error);
    }
);

// ✅ Fetch vendor dashboard stats
function fetchVendorData() {
    axiosInstance.get('/api/vendor/dashboard')
        .then(response => {
            const data = response.data;
            document.getElementById('vendorName').innerText = data.vendorName || 'Vendor';
            document.getElementById('totalQR').innerText = data.totalQR || 0;
            // document.getElementById('assignedQR').innerText = data.assignedQR || 0;
            // document.getElementById('remainingQR').innerText = data.remainingQR || 0;
        })
        .catch(error => {
            console.error('Error fetching vendor data:', error);
            alert('Failed to load vendor data.');
        });
}

// ✅ Fetch QR assignments from MongoDB
function fetchQRAssignments() {
    axiosInstance.get('/api/vendor/dashboard/qr-assignments')
        .then(response => {
            // Separate vendor and distributor assignments
            vendorAssignments = response.data.filter(assign => !assign.distributorId);
            distributorAssignments = response.data.filter(assign => assign.distributorId);
            
            // Render both tables with pagination
            renderVendorTable();
            renderDistributorTable();
        })
        .catch(error => {
            console.error('QR Assignment Fetch Error:', error);
            alert('Could not load assignment data');
        });
}

// Render Vendor Table with pagination
function renderVendorTable() {
    const tbody = document.getElementById('initialAssignmentTableBody');
    tbody.innerHTML = '';
    
    const start = (currentVendorPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = vendorAssignments.slice(start, end);
    
    pageData.forEach(assign => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${assign.vendorId || 'N/A'}</td>
            <td>${assign.qrStart}</td>
            <td>${assign.qrEnd}</td>
            <td>${assign.quantity}</td>
        `;
        tbody.appendChild(row);
    });
    
    updateVendorPagination();
}

// Render Distributor Table with pagination
function renderDistributorTable() {
    const tbody = document.getElementById('distributorAssignmentTableBody');
    tbody.innerHTML = '';
    
    const start = (currentDistributorPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = distributorAssignments.slice(start, end);
    
    pageData.forEach(assign => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', assign._id);
        row.innerHTML = `
            <td>${assign.vendorName || assign.assignedBy || '-'}</td>
            <td>${assign.vendorId || '-'}</td>
            <td>${assign.distributorId || '-'}</td>
            <td>${assign.distributorName || '-'}</td>
            <td>${assign.qrStart}</td>
            <td>${assign.qrEnd}</td>
            <td>${assign.quantity}</td>
            <td>
                <button class="edit-btn" onclick="editAssignment('${assign._id}')">Edit</button>
                <button class="delete-btn" onclick="deleteAssignment('${assign._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateDistributorPagination();
}

// Update pagination info for Vendor tab
function updateVendorPagination() {
    const totalPages = Math.ceil(vendorAssignments.length / rowsPerPage);
    const pageInfo = document.getElementById('vendorPageInfo');
    pageInfo.textContent = `Page ${currentVendorPage} of ${Math.max(1, totalPages)}`;
    
    const prevBtn = document.getElementById('vendorPrevBtn');
    const nextBtn = document.getElementById('vendorNextBtn');
    
    prevBtn.disabled = currentVendorPage === 1;
    nextBtn.disabled = currentVendorPage === totalPages || totalPages === 0;
}

// Update pagination info for Distributor tab
function updateDistributorPagination() {
    const totalPages = Math.ceil(distributorAssignments.length / rowsPerPage);
    const pageInfo = document.getElementById('distributorPageInfo');
    pageInfo.textContent = `Page ${currentDistributorPage} of ${Math.max(1, totalPages)}`;
    
    const prevBtn = document.getElementById('distributorPrevBtn');
    const nextBtn = document.getElementById('distributorNextBtn');
    
    prevBtn.disabled = currentDistributorPage === 1;
    nextBtn.disabled = currentDistributorPage === totalPages || totalPages === 0;
}

// Navigation for Vendor tab pagination
function nextVendorPage() {
    const totalPages = Math.ceil(vendorAssignments.length / rowsPerPage);
    if (currentVendorPage < totalPages) {
        currentVendorPage++;
        renderVendorTable();
    }
}

function prevVendorPage() {
    if (currentVendorPage > 1) {
        currentVendorPage--;
        renderVendorTable();
    }
}

// Navigation for Distributor tab pagination
function nextDistributorPage() {
    const totalPages = Math.ceil(distributorAssignments.length / rowsPerPage);
    if (currentDistributorPage < totalPages) {
        currentDistributorPage++;
        renderDistributorTable();
    }
}

function prevDistributorPage() {
    if (currentDistributorPage > 1) {
        currentDistributorPage--;
        renderDistributorTable();
    }
}

// ✅ Assign QR to distributor
async function assignQR() {
    const distributorId = document.getElementById('distributorIdInput').value.trim();
    const qrStart = document.getElementById('qrStartInput').value.trim();
    const qrEnd = document.getElementById('qrEndInput').value.trim();
    const quantity = document.getElementById('qrQuantityInput').value.trim();

    if (!distributorId || !qrStart || !qrEnd || !quantity) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axiosInstance.post(
            '/api/vendor/dashboard/assign-qr',
            { distributorId, qrStart, qrEnd, quantity }
        );

        alert(response.data.message || 'QR assigned successfully!');
        resetForm();
        fetchQRAssignments();
        fetchVendorData(); // Update stats
    } catch (error) {
        console.error('Error assigning QR:', error);
        const message = error.response?.data?.error || 'Failed to assign QR.';
        alert(message);
    }
}

// Edit function - populate form with assignment data
function editAssignment(assignmentId) {
    const assignment = distributorAssignments.find(a => a._id === assignmentId);
    if (!assignment) return;
    
    // Populate form with selected assignment data
    document.getElementById('distributorIdInput').value = assignment.distributorId || '';
    document.getElementById('qrStartInput').value = assignment.qrStart || '';
    document.getElementById('qrEndInput').value = assignment.qrEnd || '';
    document.getElementById('qrQuantityInput').value = assignment.quantity || '';
    
    // Change button to update mode
    const assignButton = document.getElementById('assignButton');
    assignButton.textContent = 'Update QR';
    assignButton.onclick = function() { updateAssignment(assignmentId); };
    
    // Show cancel button
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.style.display = 'block';
    }
    
    // Scroll to the form
    document.querySelector('.qr-form').scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit mode and reset form
function cancelEdit() {
    resetForm();
    
    // Reset assign button
    const assignButton = document.getElementById('assignButton');
    assignButton.textContent = 'Assign QR';
    assignButton.onclick = assignQR;
    
    // Hide cancel button
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.style.display = 'none';
    }
}

// Reset form function
function resetForm() {
    document.getElementById('distributorIdInput').value = '';
    document.getElementById('qrStartInput').value = '';
    document.getElementById('qrEndInput').value = '';
    document.getElementById('qrQuantityInput').value = '';
}

// Update assignment function
async function updateAssignment(assignmentId) {
    const distributorId = document.getElementById('distributorIdInput').value.trim();
    const qrStart = document.getElementById('qrStartInput').value.trim();
    const qrEnd = document.getElementById('qrEndInput').value.trim();
    const quantity = document.getElementById('qrQuantityInput').value.trim();

    if (!distributorId || !qrStart || !qrEnd || !quantity) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await axiosInstance.put(
            `/api/vendor/dashboard/update-qr/${assignmentId}`,
            { distributorId, qrStart, qrEnd, quantity }
        );

        alert("QR assignment updated successfully!");
        
        // Reset form and buttons
        resetForm();
        const assignButton = document.getElementById('assignButton');
        assignButton.textContent = 'Assign QR';
        assignButton.onclick = assignQR;
        
        // Hide cancel button
        const cancelButton = document.getElementById('cancelButton');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
        
        // Refresh data
        fetchQRAssignments();
        fetchVendorData(); // Update stats
    } catch (error) {
        console.error('Error updating assignment:', error);
        alert(error.response?.data?.error || 'Failed to update QR assignment.');
    }
}

// Delete assignment function
async function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this QR assignment?')) return;
    
    try {
        await axiosInstance.delete(`/api/vendor/dashboard/delete-qr/${assignmentId}`);
        
        alert('QR assignment deleted successfully!');
        fetchQRAssignments();
        fetchVendorData(); // Update stats
    } catch (error) {
        console.error('Error deleting assignment:', error);
        alert(error.response?.data?.error || 'Failed to delete QR assignment.');
    }
}

// ✅ Fetch scanned QR data with proper sorting and pagination
function fetchScannedQRData() {
    axiosInstance.get('/api/vendor/dashboard/scanned-qr-data')
        .then(response => {
            // Process and sort the data before displaying
            salesData = sortQRData(response.data);
            renderSalesTable();
        })
        .catch(error => {
            console.error('Error fetching scanned QR data:', error);
            alert('Failed to load scanned QR data.');
        });
}

// Helper function to sort QR data (pending first, then confirmed)
function sortQRData(data) {
    return data.sort((a, b) => {
        // First sort by confirmation status (pending first)
        if (a.isConfirmed && !b.isConfirmed) return 1;
        if (!a.isConfirmed && b.isConfirmed) return -1;
        
        // If both have same confirmation status, sort by date (newest first)
        return new Date(b.date) - new Date(a.date);
    });
}

// Render Sales Table with pagination
function renderSalesTable() {
    const tbody = document.getElementById('scannedQrData');
    tbody.innerHTML = '';
    
    const start = (currentSalesPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = salesData.slice(start, end);
    
    pageData.forEach(entry => {
        const isConfirmed = Boolean(entry.isConfirmed);
        const row = document.createElement('tr');
        row.className = isConfirmed ? 'confirmed-row' : '';
        row.id = `row-${entry._id}`;

        row.innerHTML = `
            <td>${new Date(entry.date).toLocaleDateString()}</td>
            <td>${entry.qrCode}</td>
            <td>${entry.salespersonId}</td>
            <td>${entry.staffName || entry.salespersonName || 'Unknown'}</td> 
            <td>${entry.salespersonPhone || entry.staffPhoneNumber}</td>
            <td>${entry.productId}</td>
            <td>${entry.unitsSold}</td>
            <td><input type="text" id="amount-${entry._id}" value="${entry.amount || ''}"></td>
            <td><input type="text" id="upi-${entry._id}" value="${entry.upiTransactionId || ''}"></td>
            <td>
                <span id="status-${entry._id}" class="${isConfirmed ? 'status-confirmed' : 'status-pending'}">
                    ${isConfirmed ? '✅ Confirmed' : 'Pending'}
                </span>
            </td>
            <td>
                <button id="confirm-btn-${entry._id}" onclick="confirmEntry('${entry._id}')" 
                    class="${isConfirmed ? 'btn-confirmed' : 'btn-confirm'}">
                    ${isConfirmed ? 'Confirmed' : 'Confirm'}
                </button>
            </td>
        `;

        tbody.appendChild(row);

        // Lock down confirmed fields
        if (isConfirmed) {
            document.getElementById(`amount-${entry._id}`).setAttribute('readonly', 'true');
            document.getElementById(`upi-${entry._id}`).setAttribute('readonly', 'true');
            document.getElementById(`confirm-btn-${entry._id}`).setAttribute('disabled', 'true');
        }
    });
    
    updateSalesPagination();
}

// Update pagination info for Sales tab
function updateSalesPagination() {
    const totalPages = Math.ceil(salesData.length / rowsPerPage);
    const pageInfo = document.getElementById('salesPageInfo');
    pageInfo.textContent = `Page ${currentSalesPage} of ${Math.max(1, totalPages)}`;
    
    const prevBtn = document.getElementById('salesPrevBtn');
    const nextBtn = document.getElementById('salesNextBtn');
    
    prevBtn.disabled = currentSalesPage === 1;
    nextBtn.disabled = currentSalesPage === totalPages || totalPages === 0;
}

// Navigation for Sales tab pagination
function nextSalesPage() {
    const totalPages = Math.ceil(salesData.length / rowsPerPage);
    if (currentSalesPage < totalPages) {
        currentSalesPage++;
        renderSalesTable();
    }
}

function prevSalesPage() {
    if (currentSalesPage > 1) {
        currentSalesPage--;
        renderSalesTable();
    }
}

// ✅ Confirm entry with visual feedback and proper handling
function confirmEntry(entryId) {
    const amount = document.getElementById(`amount-${entryId}`).value.trim();
    const upiId = document.getElementById(`upi-${entryId}`).value.trim();

    if (!amount || !upiId) {
        alert("Please enter both Amount and UPI Transaction ID.");
        return;
    }

    const confirmButton = document.getElementById(`confirm-btn-${entryId}`);
    confirmButton.disabled = true;
    confirmButton.textContent = "Processing...";
    confirmButton.classList.add('processing');

    axiosInstance.post(`/api/vendor/dashboard/confirm-entry/${entryId}`, {
        amount,
        upiTransactionId: upiId
    })
    .then(response => {
        // Update the row
        const amountInput = document.getElementById(`amount-${entryId}`);
        const upiInput = document.getElementById(`upi-${entryId}`);
        const statusLabel = document.getElementById(`status-${entryId}`);
        const row = document.getElementById(`row-${entryId}`);
    
        amountInput.readOnly = true;
        upiInput.readOnly = true;
    
        statusLabel.innerText = "✅ Confirmed";
        statusLabel.classList.remove("status-pending");
        statusLabel.classList.add("status-confirmed");
    
        confirmButton.textContent = "Confirmed";
        confirmButton.classList.remove("btn-confirm");
        confirmButton.classList.add("btn-confirmed");
        confirmButton.disabled = true;
    
        row.classList.add("confirmed-row");
    
        // Update the data and re-sort
        const entryIndex = salesData.findIndex(item => item._id === entryId);
        if (entryIndex !== -1) {
            salesData[entryIndex].isConfirmed = true;
            salesData[entryIndex].amount = amount;
            salesData[entryIndex].upiTransactionId = upiId;
            
            // Re-sort and re-render the table
            salesData = sortQRData(salesData);
            renderSalesTable();
        }
    
        alert("Entry confirmed successfully!");
    })
    .catch(error => {
        console.error('Error confirming entry:', error);
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm";
        confirmButton.classList.remove('processing');
        alert('Failed to confirm entry.');
    });
}

function openTab(evt, tabId) {
    const tabs = document.getElementsByClassName('tab-content');
    const tabButtons = document.getElementsByClassName('tab');
    for (let tab of tabs) tab.classList.remove('active');
    for (let btn of tabButtons) btn.classList.remove('active');
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
    
    // Clear search results
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
    }
}

// ✅ Logout
function logout() {
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorUser');
    window.location.href = "login.html";
}

// Global Search Function for Vendor
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
            `/api/vendor/global-search?query=${encodeURIComponent(query)}`
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
                html += `<h4>${type}s</h4>
                <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>`;
                grouped[type].forEach(entry => {
                    html += `<tr>
                    <td>${entry.name || '-'}</td>
                    <td>${entry.email || '-'}</td>
                    <td>${entry.phone || '-'}</td>
                    <td>${entry.role || '-'}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
        });
  
        if (grouped['Sale']) {
            html += `<h4>Sales</h4>
            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead><tr><th>Product ID</th><th>Salesperson ID</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
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
            html += `<h4>QR Assignments</h4>
            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                <tr>
                    <th>Assigned By</th>
                    <th>Vendor ID</th> 
                    <th>Distributor ID</th>
                    <th>Distributor Name</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>`;
            grouped['QRAssignment'].forEach(entry => {
              html += `<tr>
                  <td>${entry.assignedBy || '-'}</td>
                  <td>${entry.vendorId || '-'}</td>
                  <td>${entry.distributorId || '-'}</td>
                  <td>${entry.distributorName || '-'}</td>
                  <td>${entry.qrStart || '-'}</td>
                  <td>${entry.qrEnd || '-'}</td>
                  <td>${entry.quantity || '-'}</td>
              </tr>`;
          });
          html += `</tbody></table>`;
      }

      resultsDiv.innerHTML = html;

      // Auto-hide after 10 seconds
      setTimeout(() => {
          resultsDiv.innerHTML = '';
      }, 10000);

  } catch (error) {
      console.error('Search Error:', error);
      resultsDiv.innerHTML = "<p style='color: red;'>Failed to perform search.</p>";
  }
}