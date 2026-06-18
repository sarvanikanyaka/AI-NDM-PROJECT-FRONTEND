import { MailCheck, Scale, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

function AuthGate({ api, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const errors = validateAuthForm(form, 'register');
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage('Please fix the highlighted fields.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/api/register', form);
      setMessage(response.data.message);
      setMode('otp');
    } catch (error) {
      setMessage(formatApiError(error, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const errors = validateAuthForm(form, 'login');
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage('Please fix the highlighted fields.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await api.post('/api/login', {
        email: form.email,
        password: form.password,
      });
      onAuthenticated(response.data);
    } catch (error) {
      setMessage(formatApiError(error, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    const errors = validateOtpForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/verify-otp', {
        email: form.email,
        otp: form.otp,
      });
      setMessage('Email verified successfully. Login is now enabled.');
      setMode('login');
    } catch (error) {
      setMessage(formatApiError(error, 'Verification failed. Please check the OTP and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authShell">
      <section className="authCard glassCard">
        <div className="authBrand">
          <div className="brandMark">
            <Scale size={30} />
          </div>
          <div>
            <h1>Legal Contract Review Agent</h1>
            <p>Secure access with verified email before contract upload.</p>
          </div>
        </div>

        {mode === 'otp' ? (
          <form className="verifyPanel" onSubmit={verifyOtp}>
            <MailCheck size={42} />
            <h2>Enter email OTP</h2>
            <p>{message}</p>
            <label>
              6-digit OTP
              <input
                className={fieldErrors.otp ? 'invalid otpInput' : 'otpInput'}
                inputMode="numeric"
                maxLength={6}
                value={form.otp}
                onChange={(event) => updateForm('otp', event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
              />
              {fieldErrors.otp ? <small className="fieldError">{fieldErrors.otp}</small> : null}
            </label>
            <button className="primaryButton" type="submit" disabled={loading}>
              Verify OTP
            </button>
            <button className="ghostButton" type="button" onClick={() => setMode('login')}>
              Back to login
            </button>
          </form>
        ) : (
          <form className="authForm" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <div className="authTabs">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
                Sign in
              </button>
              <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
                Register
              </button>
            </div>
            {mode === 'register' ? (
              <label>
                Full name
                <input
                  className={fieldErrors.name ? 'invalid' : ''}
                  value={form.name}
                  onBlur={() => setFieldErrors(validateAuthForm(form, mode))}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="Example: Ananya Sharma"
                  required
                />
                {fieldErrors.name ? <small className="fieldError">{fieldErrors.name}</small> : null}
              </label>
            ) : null}
            <label>
              Email
              <input
                className={fieldErrors.email ? 'invalid' : ''}
                type="email"
                value={form.email}
                onBlur={() => setFieldErrors(validateAuthForm(form, mode))}
                onChange={(event) => updateForm('email', event.target.value)}
                placeholder="you@example.com"
                required
              />
              {fieldErrors.email ? <small className="fieldError">{fieldErrors.email}</small> : null}
            </label>
            <label>
              Password
              <input
                className={fieldErrors.password ? 'invalid' : ''}
                type="password"
                value={form.password}
                onBlur={() => setFieldErrors(validateAuthForm(form, mode))}
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder="At least 8 chars, letters and numbers"
                minLength={8}
                required
              />
              {fieldErrors.password ? <small className="fieldError">{fieldErrors.password}</small> : null}
            </label>
            <button className="primaryButton" type="submit" disabled={loading}>
              <ShieldCheck size={18} />
              {loading ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            {message ? <p className="authMessage">{message}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}

function validateAuthForm(form, mode) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namePattern = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
  if (mode === 'register' && !namePattern.test(form.name.trim())) {
    errors.name = 'Enter a real name using letters only. Numbers are not allowed.';
  }
  if (!emailPattern.test(form.email.trim())) {
    errors.email = 'Enter a valid email address, for example name@example.com.';
  }
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Password must be at least 8 characters and include letters and numbers.';
  }
  return errors;
}

function validateOtpForm(form) {
  const errors = {};
  if (!/^\d{6}$/.test(form.otp.trim())) {
    errors.otp = 'Enter the 6-digit OTP sent to your email.';
  }
  return errors;
}

function formatApiError(error, fallback) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ');
  }
  return detail || fallback;
}

export default AuthGate;
