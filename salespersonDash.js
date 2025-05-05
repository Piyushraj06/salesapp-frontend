let qrReader = null;
    let currentScanResult = null;
    let useFrontCamera = false;
    let isTorchOn = false;
    let availableCameras = [];
    
    // API endpoint to validate QR codes
    const API_ENDPOINT = "/api/validate-qr";
    
    // Base URL for the form page
    const FORM_URL = "/form.html";
    
    // Set status message with appropriate styling
    function setStatus(message, type = 'info') {
      const statusEl = document.getElementById("status-message");
      statusEl.textContent = message;
      statusEl.className = '';
      statusEl.classList.add(`status-${type}`);
    }

    async function startCamera() {
      const startButton = document.getElementById("start-camera");
      startButton.disabled = true;
      startButton.textContent = "Initializing camera...";
      
      setStatus("Checking camera permissions...", "info");

      try {
        // First check if we can access any cameras
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          availableCameras = devices;
          document.getElementById("camera-controls").style.display = "flex";
          setStatus(`Found ${devices.length} camera(s). Ready to scan.`, "success");
          initializeScanner();
        } else {
          setStatus("No cameras found on this device.", "error");
          startButton.textContent = "Retry Camera";
          startButton.disabled = false;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setStatus(`Camera error: ${err.message || "Permission denied"}`, "error");
        startButton.textContent = "Retry Camera";
        startButton.disabled = false;
      }
    }

    function initializeScanner() {
      const qrReaderContainer = document.getElementById("qr-reader");
      qrReaderContainer.innerHTML = ""; // Clear previous instance
      
      if (qrReader) {
        qrReader.clear(); // Clear any previous instance
      }

      try {
        // Use the camera ID if we have cameras available
        let cameraIdOrConfig;
        
        if (availableCameras.length > 0) {
          // Select front or back camera based on user preference
          const cameraIndex = useFrontCamera ? 0 : (availableCameras.length - 1);
          cameraIdOrConfig = availableCameras[cameraIndex].id;
        } else {
          // Fallback to facing mode if we couldn't enumerate cameras
          cameraIdOrConfig = { facingMode: useFrontCamera ? "user" : "environment" };
        }
        
        qrReader = new Html5Qrcode("qr-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        qrReader.start(
          cameraIdOrConfig,
          config,
          onScanSuccess,
          onScanProgress
        ).then(() => {
          setStatus("Camera active. Ready to scan QR codes", "success");
          document.getElementById("start-camera").style.display = "none";
          document.querySelector(".scan-indicator").style.display = "block";
        }).catch(err => {
          console.error("Failed to start camera:", err);
          setStatus(`Failed to start camera: ${err.message || "Unknown error"}`, "error");
          document.getElementById("start-camera").disabled = false;
          document.getElementById("start-camera").textContent = "Try Again";
        });
      } catch (err) {
        console.error("Scanner initialization error:", err);
        setStatus(`Scanner error: ${err.message || "Unknown error"}`, "error");
        document.getElementById("start-camera").disabled = false;
        document.getElementById("start-camera").textContent = "Try Again";
      }
    }

    async function onScanSuccess(qrCodeMessage) {
      console.log("QR Code detected:", qrCodeMessage);
      
      // Stop scanning
      if (qrReader) {
        try {
          await qrReader.stop();
          currentScanResult = qrCodeMessage;
          
          // Play beep sound to indicate scan
          playBeepSound();
          
          // Show processing toast
          showToast("Validating QR code...");
          
          // First validate if it's a properly formatted product code
          if (validateProductCodeFormat(qrCodeMessage)) {
            setStatus("Valid QR format. Checking status...", "info");
            
            // Check if product is already used - in a real app this would be an API call
            validateProductCode(qrCodeMessage);
          } else {
            // Invalid product code format
            setStatus("Invalid QR code format. Please scan a valid product code.", "warning");
            showToast("Invalid QR code format");
            
            // Restart scanner after delay
            setTimeout(() => {
              initializeScanner();
            }, 2000);
          }
        } catch (err) {
          console.error("Error stopping camera:", err);
          setStatus("Error processing scan. Please try again.", "error");
          
          // Try to restart scanner
          setTimeout(() => {
            initializeScanner();
          }, 2000);
        }
      }
    }
    
    // Validate the format of the product code
    function validateProductCodeFormat(code) {
      try {
        const url = new URL(code, window.location.origin);
        const productId = url.searchParams.get("product_id");
        return /^PROD\d{5}$/.test(productId);
      } catch (e) {
        return false;
      }
    }
    

    // Validate the product code against the database/API
    // In a real app, this would be an API call to the server
    async function validateProductCode(code) {
      try {
        // For demo purposes, we're simulating an API call with setTimeout
        // In a real app, you would make a fetch request to your API endpoint
        
        setStatus("Checking if QR code is valid and unused...", "info");
        
        // Simulating API call delay
        setTimeout(() => {
          // For this demo, we'll consider codes in product_data.csv as valid
          // In a real implementation, this would check against your database
          
          const isValid = true; // Simulating valid code
          const isAlreadyUsed = false; // Simulating unused code
          
          if (isValid && !isAlreadyUsed) {
            // Success case: Valid, unused QR code
            setStatus("Valid QR code! Redirecting to form...", "success");
            showToast("Valid QR code! Redirecting...");
            
            // Redirect to form page with product ID parameter
            redirectToForm(code);
          } else if (isValid && isAlreadyUsed) {
            // Case: Valid but already used
            setStatus("This QR code has already been used!", "warning");
            showToast("QR code already used!");
            
            // Restart scanner after delay
            setTimeout(() => {
              initializeScanner();
            }, 3000);
          } else {
            // Case: Invalid code
            setStatus("Invalid product code. Please try another.", "error");
            showToast("Invalid product code");
            
            // Restart scanner after delay
            setTimeout(() => {
              initializeScanner();
            }, 3000);
          }
        }, 1500);
        
      } catch (err) {
        console.error("Error validating product:", err);
        setStatus("Error validating product. Please try again.", "error");
        
        // Restart scanner after delay
        setTimeout(() => {
          initializeScanner();
        }, 3000);
      }
    }
    
    // Redirect to form page with the product ID
    function redirectToForm(productUrl) {
      const salespersonStr = localStorage.getItem('salespersonUser');
      const salesperson = salespersonStr ? JSON.parse(salespersonStr) : {};
      const salespersonId = salesperson?.staffId; // ✅ Use staffId (e.g. 123456_1)
    
      if (!salespersonId) {
        alert("Salesperson ID not found. Please log in again.");
        window.location.href = "login.html";
        return;
      }
    
      const url = new URL(productUrl, window.location.origin);
      url.searchParams.set("salesperson_id", salespersonId); // ✅ Append correct ID
    
      window.location.href = url.toString();
    }
    


    function onScanProgress(errorMessage, status) {
      // Only log errors to console - don't show every frame progress to user
      if (errorMessage) {
        console.warn("QR Scan Progress:", errorMessage);
      }
    }

    function playBeepSound() {
      try {
        // Create an oscillator for beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (err) {
        console.error("Error playing sound:", err);
      }
    }

    function showToast(message) {
      const toast = document.getElementById("toast-message");
      toast.textContent = message;
      toast.style.display = "block";
      
      setTimeout(() => {
        toast.style.display = "none";
      }, 3000);
    }

    // function showManualEntry() {
    //   if (qrReader) {
    //     qrReader.stop().then(() => {
    //       const manualInput = prompt("Enter Product ID (format: PRODxxxxx):");
    //       if (manualInput && validateProductCodeFormat(manualInput)) {
    //         currentScanResult = manualInput;
    //         validateProductCode(manualInput);
    //       } else if (manualInput) {
    //         alert("Invalid product ID format. Please use format PRODxxxxx (e.g., PROD00001)");
    //         setStatus("Invalid product ID format entered", "warning");
    //         initializeScanner();
    //       } else {
    //         setStatus("Manual entry canceled", "info");
    //         initializeScanner();
    //       }
    //     }).catch(err => {
    //       console.error("Error stopping camera for manual entry:", err);
    //       setStatus("Error preparing for manual entry", "error");
    //     });
    //   } else {
    //     // No active scanner, just process the manual entry
    //     const manualInput = prompt("Enter Product ID (format: PRODxxxxx):");
    //     if (manualInput && validateProductCodeFormat(manualInput)) {
    //       currentScanResult = manualInput;
    //       validateProductCode(manualInput);
    //     } else if (manualInput) {
    //       alert("Invalid product ID format. Please use format PRODxxxxx (e.g., PROD00001)");
    //       setStatus("Invalid product ID format entered", "warning");
    //     } else {
    //       setStatus("Manual entry canceled", "info");
    //     }
    //   }
    // }

    // Camera control functions
    document.getElementById("flip-camera").addEventListener("click", function() {
      if (qrReader) {
        qrReader.stop().then(() => {
          useFrontCamera = !useFrontCamera;
          this.textContent = useFrontCamera ? "Back Camera" : "Front Camera";
          initializeScanner();
        }).catch(err => {
          console.error("Error flipping camera:", err);
          setStatus("Error switching camera", "error");
        });
      }
    });

    document.getElementById("torch-toggle").addEventListener("click", function() {
      if (qrReader) {
        try {
          qrReader.toggleFlash()
            .then(() => {
              isTorchOn = !isTorchOn;
              this.textContent = isTorchOn ? "Turn Off Torch" : "Turn On Torch";
              setStatus(isTorchOn ? "Torch turned on" : "Torch turned off", "info");
            })
            .catch(err => {
              console.error("Torch error:", err);
              setStatus("Torch not available on this device or browser", "warning");
            });
        } catch (err) {
          console.error("Error toggling torch:", err);
          setStatus("Torch functionality not available", "warning");
        }
      }
    });

    // Start camera button
    document.getElementById("start-camera").addEventListener("click", startCamera);

    window.addEventListener("load", function() {
      // Initialize with status message
      setStatus("Welcome! Click 'Start Camera' to begin scanning", "info");
      
      // Hide camera controls initially
      document.getElementById("camera-controls").style.display = "none";
      
      // Hide the scan overlay initially
      document.querySelector(".scan-indicator").style.display = "none";
    });

    function logout() {
        // Example: Clear local storage or session if used
        localStorage.clear();
      
        // Redirect to login page
        window.location.href = "login.html";
      }

      function openTab(evt, tabId) {
        document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
        document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
        evt.currentTarget.classList.add("active");
      }

      const BASE_URL = 'http://localhost:5000/api/salesperson'; // 👈 Backend URL

      // // ================= QR Scanner Logic =================
      
      // // QR scanner status updates
      // function setStatus(message, type = "info") {
      //   const status = document.getElementById("status-message");
      //   status.innerText = message;
      //   status.className = "status-info";
      // }
      
      // // Start QR camera
      // document.getElementById("start-camera").addEventListener("click", function () {
      //   const qrReader = new Html5Qrcode("qr-reader");
      //   const config = { fps: 10, qrbox: 250 };
      
      //   document.getElementById("camera-controls").style.display = "flex";
      //   document.querySelector(".scan-indicator").style.display = "block";
      
      //   qrReader.start(
      //     { facingMode: "environment" },
      //     config,
      //     (decodedText) => {
      //       setStatus(`Scanned: ${decodedText}`, "success");
      //       qrReader.stop();
      //     },
      //     (errorMessage) => {
      //       console.warn(errorMessage);
      //     }
      //   );
      // });
      
      // ================= SALES DATA =================
      
      async function loadSalesData() {
  try {
    console.log("✅ Loading sales data...");
    const token = localStorage.getItem('salespersonToken');
    if (!token) {
      alert('Session expired. Please login again.');
      window.location.href = "login.html";
      return;
    }

    const res = await fetch('http://localhost:5000/api/salesperson/sales', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("SALES DATA RECEIVED:", data);

    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById("sales-table-body").innerHTML = `
        <tr><td colspan="8">No sales found.</td></tr>
      `;
      return;
    }

    // Sort pending first
    data.sort((a, b) => {
      const aStatus = a.status === '✅ Confirmed' ? 1 : 0;
      const bStatus = b.status === '✅ Confirmed' ? 1 : 0;
      return aStatus - bStatus;
    });

    const tbody = document.getElementById("sales-table-body");
    tbody.innerHTML = "";

    const clean = (val) => (val ? String(val).replace(/\n/g, '').trim() : '-');

    data.forEach((sale) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(sale.date).toLocaleDateString()}</td>
        <td>${clean(sale.productId)}</td>
        <td>${clean(sale.salespersonId)}</td>
        <td>${clean(sale.salespersonName)}</td>   <!-- ✅ Make sure this property name matches the backend -->
        <td>${clean(sale.salespersonPhone)}</td>
        <td>${clean(sale.stoveOrderId)}</td>
        <td>1</td>
        <td>₹${sale.amount || ''}</td>
        <td>${clean(sale.upiTransactionId)}</td>
        <td>${clean(sale.status)}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error("Error fetching sales data:", err);
    alert("An error occurred while fetching sales data.");
  }
}
      
      // ✅ Ensure it auto-loads when page loads
      window.addEventListener("load", () => {
        setStatus("Welcome! Click 'Start Camera' to begin scanning", "info");
        document.getElementById("camera-controls").style.display = "none";
        document.querySelector(".scan-indicator").style.display = "none";
      
        loadSalesData(); // ✅ Trigger sales loading
      });
      
      // Your openTab() and other functions remain as they are
      
      
      

      // ================= COMPLAINT FORM =================
      
      async function submitComplaint(event) {
        event.preventDefault();
      
        const productId = document.getElementById("product-id").value;
        const issue = document.getElementById("issue").value;
      
        const complaintData = {
          productId,
          issue,
          salespersonId: JSON.parse(localStorage.getItem('salespersonUser'))?._id, // 💥 hardcoded or dynamically fetched
          vendorId: "VENDOR001",            // 💥 optional if vendor known
          date: new Date().toISOString()
        };
      
        const res = await fetch('http://localhost:5000/api/salesperson/complaints', {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(complaintData)
        });
      
        if (res.ok) {
          alert("Complaint submitted successfully!");
          document.getElementById("complaint-form").reset();
        } else {
          alert("Failed to submit complaint");
        }
      }

      
      // ================= TAB SWITCHING =================
      
      function openTab(evt, tabId) {
        document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
      
        evt.currentTarget.classList.add("active");
        document.getElementById(tabId).classList.add("active");
      
        if (tabId === "salesTab") loadSalesData();
      }
      
      // ================= INIT =================
      
      // window.addEventListener("load", () => {
      //   setStatus("Welcome! Click 'Start Camera' to begin scanning", "info");
      //   document.getElementById("camera-controls").style.display = "none";
      //   document.querySelector(".scan-indicator").style.display = "none";
      
      //   // Preload sales data if needed
      //   loadSalesData();
      // });

      
      