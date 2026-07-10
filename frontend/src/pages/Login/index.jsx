import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { login } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const currentUser = await login(email, password);

      setUser(currentUser);

      navigate("/");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <MainLayout>
      <div
        style={{
          maxWidth: 400,
          margin: "80px auto",
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        <h2>Entrar</h2>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>
          Entrar
        </button>
        <p
            style={{
              textAlign: "center",
              cursor: "pointer",
              color: "#2563eb",
            }}
            onClick={() => navigate("/register")}
          >
            Não possui uma conta? Cadastre-se
          </p>
      </div>
    </MainLayout>
  );
}

export default Login;