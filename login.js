document.getElementById('role').addEventListener('change', function () {
  const role = this.value;
  const salespersonIdGroup = document.getElementById('salesperson-id-group');
  const vendorIdGroup = document.getElementById('vendor-id-group');
  const signupTextSales = document.getElementById('signup-text-sales');
  const signupTextVendor = document.getElementById('signup-text-vendor');

  if (role === 'sales') {
    salespersonIdGroup.style.display = 'block';
    vendorIdGroup.style.display = 'none';
    signupTextSales.style.display = 'block';
    signupTextVendor.style.display = 'none';
  } else if (role === 'vendor') {
    salespersonIdGroup.style.display = 'none';
    vendorIdGroup.style.display = 'block';
    signupTextSales.style.display = 'none';
    signupTextVendor.style.display = 'block';
  } else {
    salespersonIdGroup.style.display = 'none';
    vendorIdGroup.style.display = 'none';
    signupTextSales.style.display = 'none';
    signupTextVendor.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', function () {
  // const rememberedEmail = localStorage.getItem('rememberedEmail');
  // const rememberedPassword = localStorage.getItem('rememberedPassword');
  // const rememberedRole = localStorage.getItem('rememberedRole');

  const role = document.getElementById('role').value;
  const salespersonIdGroup = document.getElementById('salesperson-id-group');
  const vendorIdGroup = document.getElementById('vendor-id-group');
  const signupTextSales = document.getElementById('signup-text-sales');
  const signupTextVendor = document.getElementById('signup-text-vendor');

  if (rememberedEmail && rememberedPassword) {
    document.getElementById('email').value = rememberedEmail;
    document.getElementById('password').value = rememberedPassword;

    if (rememberedRole) {
      document.getElementById('role').value = rememberedRole;
      document.getElementById('role').dispatchEvent(new Event('change'));
    }
  }

  // Initialize display on first load
  if (role === 'sales') {
    salespersonIdGroup.style.display = 'block';
    vendorIdGroup.style.display = 'none';
    signupTextSales.style.display = 'block';
    signupTextVendor.style.display = 'none';
  } else if (role === 'vendor') {
    salespersonIdGroup.style.display = 'none';
    vendorIdGroup.style.display = 'block';
    signupTextSales.style.display = 'none';
    signupTextVendor.style.display = 'block';
  } else {
    salespersonIdGroup.style.display = 'none';
    vendorIdGroup.style.display = 'none';
    signupTextSales.style.display = 'none';
    signupTextVendor.style.display = 'none';
  }
});

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.toLowerCase();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const vendorId = document.getElementById('vendor-id')?.value;
  const errorMessage = document.getElementById('error-message');

  // Dummy JWT creator (frontend simulation)
  function createToken(payload) {
    return btoa(JSON.stringify(payload));
  }

  if (role === 'sales') {
    if (role === 'sales') {
      try {
        const response = await axios.post('https://salesapp-backend-1.onrender.com/api/auth/login', {
          email,
          password,
          staffId: document.getElementById('salesperson-id').value
        });
    
        const { token, user } = response.data;
    
        // ✅ Save using correct keys for salesperson dashboard
        localStorage.setItem('salespersonToken', token);
        localStorage.setItem('salespersonUser', JSON.stringify(user));
    
        alert("✅ Login successful!");
        window.location.href = 'salesPerson-dashboard.html';
      } catch (err) {
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = err.response?.data?.error || 'Server error occurred. Please try again.';
        console.error(err);
      }
    }    
  }
  
   else if (role === 'vendor') {
    try {
      const response = await axios.post('https://salesapp-backend-1.onrender.com/api/vendor/login', {
        vendorId,
        email,
        password
      });

      const { token, vendor } = response.data;
      localStorage.setItem('vendorToken', token);
      localStorage.setItem('vendorUser', JSON.stringify(vendor));

      alert("✅ Login successful!");
      window.location.href = 'vendor.html';
    } catch (err) {
      if (err.response?.data?.error === 'Vendor not found') {
        window.location.href = 'registerVendor.html';
      } else {
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = err.response?.data?.error || 'Details mismatch. Contact Admin Team Office.';
        console.error(err);
      }
    }
  } else if (role === 'admin') {
    const adminData = { email: 'piyushraj577mth@gmail.com', password: 'Piyush123' };

    if (email === adminData.email && password === adminData.password) {
      const adminToken = createToken({ email, role: 'admin' });
      localStorage.setItem('adminToken', adminToken);
      localStorage.setItem('adminUser', JSON.stringify({ email }));
      window.location.href = 'admin.html';
    } else {
      errorMessage.style.display = 'block';
      errorMessage.innerHTML = 'Details mismatch. Contact Admin Team Office.';
    }
  }
});
