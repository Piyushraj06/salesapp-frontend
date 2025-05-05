document.getElementById("salesRegisterForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const formElements = {
    name: document.getElementById("salesName"),
    email: document.getElementById("salesEmail"),
    phone: document.getElementById("salesPhone"),
    staffId: document.getElementById("salesId"),
    password: document.getElementById("salesPassword"),
    confirmPassword: document.getElementById("salesConfirmPassword")
  };

  const formData = {
    name: formElements.name.value.trim(),
    email: formElements.email.value.trim(),
    phone: formElements.phone.value.trim(),
    staffId: formElements.staffId.value.trim(),
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
    const response = await axios.post('https://salesapp-backend-1.onrender.com/api/auth/register', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      staffId: formData.staffId,
      password: formData.password
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      alert("✅ Registration successful!");
      window.location.href = "login.html"; // ✅ correct
    }
  } catch (error) {
    console.error("Registration error:", error);
    const errorMessage = error.response?.data?.error || "Registration failed. Please try again.";
    
    if (errorMessage.includes('Email')) formElements.email.classList.add('error');
    if (errorMessage.includes('Staff ID')) formElements.staffId.classList.add('error');
    if (errorMessage.includes('Phone')) formElements.phone.classList.add('error');
    
    alert(`🚫 ${errorMessage}`);
  }
});