<button class="back" data-action="nav" data-id="proposals">{{back}} Mis propuestas</button>{{heading}}<form id="proposalForm" novalidate>
<div class="grid-2">
<div class="stack">
<section class="card">
<div class="card-title">
<h2>Información de la propuesta</h2>
<div class="card-header-icon">{{proposalIcon}}</div>
</div>
<div class="field">
<label for="proposalTitle">Título de la propuesta</label>
<input id="proposalTitle" name="title" value="{{title}}" placeholder="¿Cómo se llamará tu proyecto?" maxlength="150">
</div>
<div class="field">
<label for="proposalDescription">Descripción</label>
<textarea id="proposalDescription" name="description" placeholder="Explica el problema y qué propone resolver tu equipo.">{{description}}</textarea>
</div>
</section>{{evidence}}<section class="card">
<div class="card-title">
<div>
<h2>Equipo de trabajo</h2>
<p class="small muted">Misma carrera, de cualquier año o ciclo. Cada integrante debe cursar al menos una asignatura de las rúbricas elegidas.</p>
</div>{{teamIcon}}</div>
<label class="field">Buscar integrante<input id="memberSearch" class="member-search" placeholder="Nombre del alumno">
</label>{{members}}</section>
</div>
<aside class="stack sticky">
<section class="card">
<div class="card-title">
<h2>Rúbricas y cobertura</h2>
<span class="course-tag">{{count}} elegidas</span>
</div>
<div id="coverageList">{{coverage}}</div>{{rubricPicker}}</section>
<div id="formError" class="error-box notice danger" role="alert"></div>
<div class="actions">{{save}}{{send}}</div>
<p class="small muted">Se validarán el mínimo de rúbricas, las matrículas y el plazo de recepción.</p>
</aside>
</div>
</form>
