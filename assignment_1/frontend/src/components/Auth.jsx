import {useState} from "react";
import {login, register} from "../services/AuthAPI.js";

export default function Auth()
{
  const [firstName, setFirstName]=useState("");
  const [lastName, setLastName]=useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [darkMode, setDarkMode]=useState(false);

  const submitForm=async(e) =>
  {
    e.preventDefault();
    try
    {
        let loginMode;
        if(isLogin)
        {
            loginMode=await login({email,password});
        }
        else loginMode=await register({firstName,lastName,email,password});
        setMsg(loginMode.data.message || "Login successful");
    }
    catch(err)
    {
        setMsg(err.response?.data?.message || "An error occurred, please try again later");
    }
  };

return (
  <div style={darkMode ? styles.container_dark : styles.container}>
    <div style={darkMode ? styles.box_dark : styles.box}>
      <h2 style={darkMode ? styles.heading_dark : styles.heading}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </h2>
      <form onSubmit={submitForm} style={styles.form}>
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              required
              onChange={(e) => setFirstName(e.target.value)}
              style={darkMode ? styles.input_dark : styles.input}
            />
            <input
              type="text"
              placeholder="Last Name"
              required
              onChange={(e) => setLastName(e.target.value)}
              style={darkMode ? styles.input_dark : styles.input}
            />
          </>
        )}
        <input
          type="email"
          placeholder="person@example.com"
          required
          onChange={(e) => setEmail(e.target.value)}
          style={darkMode ? styles.input_dark : styles.input}
        />

        <div style={styles.passwordArea}>
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            required
            onChange={(e) => setPassword(e.target.value)}
            style={darkMode ? styles.passwordInput_dark : styles.passwordInput}
          />
          <button style={darkMode ? styles.showBtn_dark : styles.showBtn}
            type="button"
            onMouseEnter={(e) => {e.target.style.textDecoration = "underline"; e.target.style.color="#9807f9"; e.target.style.scale="1.1"; e.target.style.transition="all 0.2s";}}
            onMouseLeave={(e) => {e.target.style.textDecoration = "none"; e.target.style.color=darkMode ? "#4dabf7" : "#007bff"; e.target.style.scale="1";}}
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>

        <button type="submit" style={darkMode ? styles.button_dark : styles.button}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>

      <p onClick={() => setIsLogin(!isLogin)} style={darkMode ? styles.toggle_dark : styles.toggle}>
        {isLogin
          ? "New user? Register here"
          : "Already have an account? Login"}
      </p>

      {msg && <p style={styles.message}>{msg}</p>}
    </div>

  <div style={darkMode ? styles.darkModeContainer_dark : styles.darkModeContainer}>
    <span style={darkMode ? styles.darkModeText_dark : styles.darkModeText}>{!darkMode ? "Dark Mode" : "Light Mode"}</span>

    <button
      onClick={() => setDarkMode(!darkMode)}
      type="button"
      style={{
        ...(darkMode ? styles.darkModeSwitch_dark : styles.darkModeSwitch),
        justifyContent: darkMode ? "flex-end" : "flex-start"
      }}
      aria-label="Toggle dark mode"
    >
      <span style={darkMode ? styles.darkModeThumb_dark : styles.darkModeThumb}></span>
    </button>
  </div>

  </div>
);

}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f8",
  },

  container_dark: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#1a1a1a",
  },

  box: {
    width: "320px",
    padding: "24px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center",
  },

  box_dark: {
    width: "320px",
    padding: "24px",
    background: "#2d2d2d",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    textAlign: "center",
  },

  heading: {
    marginBottom: "20px",
    fontWeight: "600",
    color: "#333",
  },

  heading_dark: {
    marginBottom: "20px",
    fontWeight: "600",
    color: "#ffffff",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  input: {
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#333",
  },

  input_dark: {
    padding: "10px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #444",
    outline: "none",
    boxSizing: "border-box",
    background: "#1a1a1a",
    color: "#ffffff",
  },

  button: {
    marginTop: "10px",
    padding: "10px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "15px",
    cursor: "pointer",
  },

  button_dark: {
    marginTop: "10px",
    padding: "10px",
    background: "#4dabf7",
    color: "#000",
    border: "none",
    borderRadius: "4px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "500",
  },

  toggle: {
    marginTop: "14px",
    fontSize: "14px",
    color: "#007bff",
    cursor: "pointer",
  },

  toggle_dark: {
    marginTop: "14px",
    fontSize: "14px",
    color: "#4dabf7",
    cursor: "pointer",
  },

  message: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#d9534f",
  },

  passwordArea: {
    position: "relative",
    width: "100%",
  },

  passwordInput: {
    width: "100%",
    padding: "10px",
    paddingRight: "64px", 
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#333",
  },

  passwordInput_dark: {
    width: "100%",
    padding: "10px",
    paddingRight: "64px", 
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #444",
    outline: "none",
    boxSizing: "border-box",
    background: "#1a1a1a",
    color: "#ffffff",
  },

  showBtn: {
    position: "absolute",
    top: "50%",
    right: "10px",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#007bff",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
  },

  showBtn_dark: {
    position: "absolute",
    top: "50%",
    right: "10px",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#4dabf7",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
  },

  darkModeContainer: {
    position: "absolute",
    bottom: "24px",
    right: "24px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    padding: "8px 12px",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontSize: "13px",
  },

  darkModeContainer_dark: {
    position: "absolute",
    bottom: "24px",
    right: "24px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#2d2d2d",
    padding: "8px 12px",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(255, 255, 255, 0.1)",
    fontSize: "13px",
  },

  darkModeText: {
    color: "#333",
    fontWeight: "500",
  },

  darkModeText_dark: {
    color: "#ffffff",
    fontWeight: "500",
  },

  darkModeSwitch: {
    width: "36px",
    height: "20px",
    background: "#ccc",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
  },

  darkModeSwitch_dark: {
    width: "36px",
    height: "20px",
    background: "#4dabf7",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
  },

  darkModeThumb: {
    width: "16px",
    height: "16px",
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  },

  darkModeThumb_dark: {
    width: "16px",
    height: "16px",
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  }
};