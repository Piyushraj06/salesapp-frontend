document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.toLowerCase();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const staffId = document.getElementById('staffId')?.value;

  if (role === "salesperson") {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
        staffId
      });

      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      alert("✅ Login successful!");
      window.location.href = "salesperson-dashboard.html";

    } catch (err) {
      alert("❌ Login failed: " + (err.response?.data?.error || "Server error"));
      console.error(err);
    }
  } else {
    // Hardcoded login for admin/vendor (keep if needed)
    const validUsers = {
      "piyushraj577mth@gmail.com": {
        password: "Piyush123",
        roles: ["admin", "vendor"],
        name: "Piyush Raj"
      }
    };

    if (
      validUsers[email] &&
      validUsers[email].password === password &&
      validUsers[email].roles.includes(role)
    ) {
      sessionStorage.setItem('currentUser', JSON.stringify({
        email,
        role,
        name: validUsers[email].name
      }));
      window.location.href = `${role}.html`;
    } else {
      alert("❌ Invalid login credentials");
    }
  }
});
