<h1 class="welcome">
<span>Bienvenido,</span> {{name}}</h1>
    <div class="portal-grid">
      {{inbox}}
      {{rubrics}}
      <section class="card">
<div class="card-title">
<h2>Propuestas recientes</h2>{{proposalIcon}}</div>
        {{recent}}</section>
      <section class="card">
<div class="card-title">
<h2>Resumen académico</h2>{{rubricIcon}}</div>
        <div class="portal-row">Propuestas {{proposalLabel}}<strong>{{count}}</strong>
</div>
        <div class="portal-row">{{reviewLabel}}<strong>{{pending}}</strong>
</div>
        <div class="portal-row">Proyectos vinculados<strong>{{projects}}</strong>
</div>
</section>
      <section class="card portal-table">
<div class="card-title">
<h2>Seguimiento de proyectos</h2>{{trackingLink}}</div>
        {{tracking}}
      </section>
    </div>
