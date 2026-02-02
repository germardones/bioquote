Markdown
# PROJECT CONTEXT: BioBio Code ERP (Firebase Version)

## 1. Visión del Proyecto
Desarrollar una plataforma de gestión interna (ERP) para "BioBio Code".
**Objetivo:** Eliminar la cotización "al ojo" mediante un algoritmo paramétrico que asegure la rentabilidad, usando Firebase para un desarrollo ágil y sin servidor.

## 2. Reglas de Negocio (Core Business Logic)

### A. Filosofía de Precios
El sistema distingue entre:
1.  **Costo Técnico:** Horas reales de desarrollo (usando Antigravity).
2.  **Valor Comercial:** Horas de mercado (lo que percibe el cliente).
* **Meta:** La eficiencia interna (Antigravity) aumenta el margen, no baja el precio artificialmente.

### B. Algoritmo de Cotización (The Pricing Engine)
* **Inputs (Variables):**
    * `entidades`: Cantidad de modelos de datos (Base: 4h c/u).
    * `roles`: Roles de usuario adicionales (Base: 2h c/u).
    * `vistas`: Pantallas clave (Base: 3h c/u).
    * `apis`: Integraciones externas (Base: 8h c/u).
    * `factor_complejidad`: Multiplicador (1.0 - 1.5).
* **Fórmula:**
    * `horas_mercado` = (Sumatoria Inputs) * factor_complejidad
    * `horas_reales` = horas_mercado * (1 - factor_antigravity)
    * `precio_sugerido` = (horas_mercado * tarifa_venta) + buffer(20%)

## 3. Módulos del Sistema (Firebase)

### Módulo 1: Cotizador & CRM
* Gestión de prospectos y generación de presupuestos.
* Los estados del Pipeline se manejan como un campo `status` en el documento del proyecto.

### Módulo 2: Finanzas
* Registro de flujos de entrada y salida.
* Dashboard en tiempo real usando los listeners de Firestore.

## 4. Estructura de Datos (Firestore Schema)

En lugar de tablas SQL, utilizaremos Colecciones y Documentos.

### Colección: `settings`
*(Documento único ID: 'global_config')*
Mantiene las variables constantes para el cálculo.
```json
{
  "valor_hora_costo": 15000,
  "valor_hora_venta": 25000,
  "factor_seguridad": 1.20,
  "factor_antigravity_default": 0.50
}
Colección: clients
Información de empresas y contactos.

JSON
{
  "id": "auto-generated-id",
  "name": "Taller Mecánico Don Pepe",
  "contact_email": "pepe@taller.cl",
  "industry": "Automotriz",
  "status": "Active", // Lead, Active, Churned
  "created_at": "Timestamp"
}
Colección: projects
Contiene la cotización y el estado del proyecto.
Nota: Usamos desnormalización ligera. Guardamos client_name aquí para no tener que leer dos documentos al listar proyectos.

JSON
{
  "id": "auto-generated-id",
  "client_id": "ref_to_clients_doc", 
  "client_name": "Taller Mecánico Don Pepe", // Copia para lectura rápida
  "name": "Sistema de Agendamiento",
  "status": "Draft", // Draft, Sent, Approved, Rejected, Completed
  
  // Objeto de Inputs Técnicos
  "specs": {
    "entity_count": 3,
    "role_count": 2,
    "view_count": 5,
    "api_count": 1,
    "complexity": 1.1
  },

  // Snapshot Financiero (Calculado al guardar)
  "financials": {
    "estimated_hours_market": 45,
    "estimated_hours_real": 22,
    "quoted_price": 1200000,
    "internal_cost": 330000,
    "projected_margin": 870000
  },
  
  "created_at": "Timestamp",
  "updated_at": "Timestamp"
}
Colección: transactions
Movimientos de caja.

JSON
{
  "id": "auto-generated-id",
  "project_id": "ref_to_projects_doc", // Opcional (null si es gasto gral)
  "type": "Income", // Income, Expense
  "category": "Project_Payment", // Salary, Server, Tax, etc.
  "amount": 500000,
  "date": "Timestamp",
  "description": "Pago anticipo 50%"
}
5. Consideraciones de Implementación
Queries: Para el Dashboard Financiero, se requerirán índices compuestos en Firestore (ej: category + date).

Seguridad: Configurar Firestore Rules para que solo el usuario autenticado (tú) pueda leer/escribir en estas colecciones.

Lógica: El cálculo de precios se realizará en el cliente (Frontend) antes de guardar el documento en projects.