import { useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { register } from "../../services/authService";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    try {
      setLoading(true);

      const user = await register(email, password);

      alert(`Usuário ${user.email} criado com sucesso!`);

      navigate("/login");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div
        style={{
          maxWidth: 450,
          margin: "80px auto",
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        <h2>Criar Conta</h2>

        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Criando..." : "Criar Conta"}
        </button>
      </div>
    </MainLayout>
  );
}

export default Register;