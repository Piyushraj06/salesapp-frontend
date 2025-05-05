const form = document.getElementById("stoveCampaignForm");
const submitBtn = document.getElementById("submitBtn");

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("product_id");
const salespersonId = urlParams.get("salesperson_id");

// 🔒 Block if either ID is missing
if (!productId || !salespersonId) {
    alert("❌ You are not an authorized person. Access denied.");
    window.location.href = "unauthorized.html"; // Or window.close();
} else {
    // ✅ Set product ID (display only)
    document.getElementById("productId").textContent = productId;

    // ✅ Set Salesperson ID (readonly input)
    document.getElementById("deliveryStaffId").value = salespersonId;
    document.getElementById("deliveryStaffId").readOnly = true;
}

const requiredFields = [
    "deliveryStaffId",
    "customerMobileNo",
    "customerName",
    "stoveOrderId",
    "staffPhoneNumber",
    "staffUpiId"
];

form.addEventListener("input", () => {
    const allFilled = requiredFields.every(id => {
        const field = document.getElementById(id);
        return field && field.value.trim() !== "";
    });
    submitBtn.disabled = !allFilled;
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData.entries());

    formObject.product_id = productId;
    formObject.delivery_staff_id = document.getElementById("deliveryStaffId").value;

    axios.post("http://localhost:5000/api/submit-sale", formObject)
        .then(response => {
            if (response.status === 201) {
                alert("✅ Form submitted successfully!");
                form.reset();
                window.location.href = './salesperson-dashboard.html';
            } else {
                alert("❌ Submission failed!");
            }
        })
        .catch(error => {
            if (error.response?.status === 409) {
                alert("🚫 This QR has already been submitted!");
                form.reset();
                window.location.href = './salesperson-dashboard.html';
            } else {
                alert("🚫 Error submitting form.");
            }
            console.error("Form Error:", error);
        });
});
