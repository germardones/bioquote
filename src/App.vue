<template>
  <div>
    <header class="header">
      <div class="header-content">
        <!-- Puedes cambiar el texto por tu logo si tienes -->
        <img src="../src/assets/img/logo.png" alt="BioQuote" class="logo" />
        <h1>BioQuote</h1>
      </div>
    </header>

    <router-view />

    <footer class="footer">
      <p>© {{ new Date().getFullYear() }} BioBio Code - Todos los derechos reservados.</p>
      <p>Contacto: contacto@biobiocode.cl</p>
    </footer>
  </div>
</template>

<style scoped>
.header {
  background-color: var(--dark);
  padding: 1rem;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  height: 40px;
}

.footer {
  background-color: var(--primary);
  color: white;
  padding: 1rem;
  text-align: center;
  margin-top: 2rem;
}
</style>
