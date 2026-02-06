import {useState} from "react";
import { useNavigate } from 'react-router-dom'
import {login, register} from "./services/AuthAPI.js";
import './login.css';

export default function Login()
{
  const navigate = useNavigate();
  const [firstName, setFirstName]=useState("");
  const [lastName, setLastName]=useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]=useState("user");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [darkMode, setDarkMode]=useState(true);


  const emailValidator = (email) => {
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@(research\.iiit\.ac\.in|students\.iiit\.ac\.in|iiit\.ac\.in)$/;

    if (!emailRegex.test(email)) {
      throw new Error("Please use a valid IIIT email address");
    }
  };


  const submitForm=async(e) =>
  {
    e.preventDefault();
    try
    {
        emailValidator(email);
        let loginMode;
        if(isLogin)
        {
            loginMode=await login({email,password, role});
        }
        else loginMode=await register({firstName,lastName,email,password, role});
        const userRole = loginMode.data.user?.role || 'user';
        setMsg(`Login successful! Your role is: ${userRole}`);
        try {
          if (loginMode.data?.user) {
            localStorage.setItem('user', JSON.stringify(loginMode.data.user));
          }
          if (loginMode.data?.token) {
            localStorage.setItem('token', loginMode.data.token);
          }
        } catch {}

        // redirect based on role
        if (userRole === 'user') {
          navigate('/user');
        } else if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'organizer') {
          navigate('/organizer');
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