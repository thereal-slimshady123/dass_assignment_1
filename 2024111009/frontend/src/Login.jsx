import {useState} from "react";
import { useNavigate } from 'react-router-dom'
import {login, register} from "./services/AuthAPI.js";
import './login.css';

export default function Login()
{
  const navigate = useNavigate();
  const [firstName, setFirstName]=useState("");
  const [lastName, setLastName]=useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType]=useState("nonIIIT");
  const [collegeName, setCollegeName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [darkMode, setDarkMode]=useState(true);


  const emailValidator = (email, type) => {
    if (type === 'IIIT') {
      const emailRegex =
        /^[a-zA-Z0-9._%+-]+@(research\.iiit\.ac\.in|students\.iiit\.ac\.in|iiit\.ac\.in)$/;
      if (!emailRegex.test(email)) {
        throw new Error("IIIT email must be @research.iiit.ac.in, @students.iiit.ac.in, or @iiit.ac.in");
      }
    }
  };


  const submitForm=async(e) =>
  {
    e.preventDefault();
    try
    {
        if (!isLogin) {
          emailValidator(email, userType);
        }
        let loginMode;
        if(isLogin)
        {
            loginMode=await login({email,password});
        }
        else {
            loginMode=await register({
              firstName,
              lastName,
              email,
              password,
              userType,
              college_name: collegeName,
              phone_number: phoneNumber
            });
        }
        
        const userRole = loginMode.data.user?.role || 'user';
        setMsg(`Login successful! Your role is: ${userRole}`);
        
        try {
          if (loginMode.data?.user) {
            localStorage.setItem('user', JSON.stringify(loginMode.data.user));
          }
          if (loginMode.data?.token) {
            localStorage.setItem('token', loginMode.data.token);
          }
          if (!isLogin && password) {
            localStorage.setItem('auth_password', password);
          }
        } catch {}

        // After registration, go to interests onboarding; otherwise role-based redirect
        if (!isLogin) {
          navigate('/interests');
          return;
        }

        if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'organizer') {
          navigate('/organizer');
        } else {
          navigate('/user');
        }
    }
    catch(err)
    {
        setMsg(err.message||err.response?.data?.message || "An error occurred, please try again later");
    }
  };

return (
  <div className={darkMode ? "container_dark" : "container"}>
    <div className={darkMode ? "box_dark" : "box"}>
      <h2 className={darkMode ? "heading_dark" : "heading"}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </h2>
      <form onSubmit={submitForm} className="form">
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              required
              onChange={(e) => setFirstName(e.target.value)}
              className={darkMode ? "input_dark" : "input"}
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              onChange={(e) => setLastName(e.target.value)}
              className={darkMode ? "input_dark" : "input"}
            />
            <div className="roleSelector">
              <label className={darkMode ? "roleLabel_dark" : "roleLabel"}>
                Select Affiliation:
              </label>
              <div className="roleButtons">
                <button
                  type="button"
                  onClick={() => setUserType("IIIT")}
                  className={`${darkMode ? "roleButton_dark" : "roleButton"} ${userType === "IIIT" ? (darkMode ? "roleButtonActive_dark" : "roleButtonActive") : ""}`}
                >
                  IIIT
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("nonIIIT")}
                  className={`${darkMode ? "roleButton_dark" : "roleButton"} ${userType === "nonIIIT" ? (darkMode ? "roleButtonActive_dark" : "roleButtonActive") : ""}`}
                >
                  Non-IIIT
                </button>
              </div>
            </div>
            {userType === "IIIT" && (
              <p className={darkMode ? "emailHint_dark" : "emailHint"}>
                Use email from @research.iiit.ac.in, @students.iiit.ac.in, or @iiit.ac.in
              </p>
            )}
          </>
        )}
        <input
          type="email"
          placeholder="person@example.com"
          required
          onChange={(e) => setEmail(e.target.value)}
          className={darkMode ? "input_dark" : "input"}
        />

        <div className="passwordArea">
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            required
            onChange={(e) => setPassword(e.target.value)}
            className={darkMode ? "passwordInput_dark" : "passwordInput"}
          />
          <button className={darkMode ? "showBtn_dark" : "showBtn"}
            type="button"
            onMouseEnter={(e) => {e.target.style.textDecoration = "underline"; e.target.style.color="#9807f9"; e.target.style.scale="1.1"; e.target.style.transition="all 0.2s";}}
            onMouseLeave={(e) => {e.target.style.textDecoration = "none"; e.target.style.color=darkMode ? "#4dabf7" : "#007bff"; e.target.style.scale="1";}}
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>

        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="College/Organization Name"
              required
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className={darkMode ? "input_dark" : "input"}
            />
            <input
              type="tel"
              placeholder="Phone Number"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={darkMode ? "input_dark" : "input"}
            />
          </>
        )}

        <button type="submit" className={darkMode ? "button_dark" : "button"}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p onClick={() => setIsLogin(!isLogin)} className={darkMode ? "toggle_dark" : "toggle"}>
        {isLogin
          ? "New user? Register here"
          : "Already have an account? Login"}
      </p>

      {msg && <p className="message">{msg}</p>}
    </div>

  <div className={darkMode ? "darkModeContainer_dark" : "darkModeContainer"}>
    <span className={darkMode ? "darkModeText_dark" : "darkModeText"}>Dark Mode </span>

    <button
      onClick={() => setDarkMode(!darkMode)}
      type="button"
      className={darkMode ? "darkModeSwitch_dark" : "darkModeSwitch"}
      style={{
        justifyContent: darkMode ? "flex-end" : "flex-start"
      }}
      aria-label="Toggle dark mode"
    >
      <span className={darkMode ? "darkModeThumb_dark" : "darkModeThumb"}></span>
    </button>
  </div>

  </div>
);

}