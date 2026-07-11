import styles from "./styles.module.css";

// Placeholder da Visão Geral — substituído pela implementação completa na US5
// (specs/003-admin-dashboard/tasks.md, T046).
function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Visão geral</h1>

      <p className={styles.subtitle}>
        Os indicadores do negócio aparecerão aqui. Use o menu lateral para
        navegar entre os módulos do painel.
      </p>
    </div>
  );
}

export default Dashboard;
