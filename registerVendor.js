document.getElementById("vendorRegisterForm").addEventListener("submit", async function (event) {
    event.preventDefault();
  
    const formElements = {
      name: document.getElementById("vendorName"),
      email: document.getElementById("vendorEmail"),
      phone: document.getElementById("vendorPhone"),
      vendorId: document.getElementById("vendorId"),
      password: document.getElementById("vendorPassword"),
      confirmPassword: document.getElementById("vendorConfirmPassword")
    };
  
    const formData = {
      name: formElements.name.value.trim(),
      email: formElements.email.value.trim(),
      phone: formElements.phone.value.trim(),
      vendorId: formElements.vendorId.value.trim(),
      password: formElements.password.value.trim(),
      confirmPassword: formElements.confirmPassword.value.trim()
    };
  
    // Clear errors
    Object.values(formElements).forEach(element => element.classList.remove('error'));
  
    // Validation
    let isValid = true;
    Object.entries(formData).forEach(([key, value]) => {
      if (!value) {
        formElements[key].classList.add('error');
        isValid = false;
      }
    });
  
    if (!isValid) return alert("⚠️ All fields are required.");
    if (formData.password !== formData.confirmPassword) {
      formElements.password.classList.add('error');
      formElements.confirmPassword.classList.add('error');
      return alert("❌ Passwords do not match.");
    }
  
    try {
        const response = await axios.post('http://localhost:5000/api/vendor/register', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          vendorId: formData.vendorId,
          password: formData.password,
          role: 'vendor' // important if backend uses role distinction
        });
      
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          alert("✅ Vendor registration successful!");
          window.location.href = "login.html";
        }
      } catch (error) {
        console.error("Registration error:", error);
        const errorMessage = error.response?.data?.error || "Registration failed. Please try again.";
      
        if (errorMessage.includes('Email')) formElements.email.classList.add('error');
        if (errorMessage.includes('Vendor ID')) formElements.vendorId.classList.add('error');
        if (errorMessage.includes('Phone')) formElements.phone.classList.add('error');
      
        alert(`🚫 ${errorMessage}`);
      }      
  });
  