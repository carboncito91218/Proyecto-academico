<section class="card assistant">
<div class="field">
<label for="assistantTeam">Propuesta de referencia</label>
<select id="assistantTeam">{{teams}}</select>
</div>
<div class="chat-log" aria-live="polite">
<div class="chat-bubble">
<strong>Asistente académico</strong>
<p>Puedo sugerir ideas, distribuir tareas o repasar las competencias de las rúbricas de tu equipo.</p>
</div>{{messages}}</div>
<div class="prompt-chips">{{prompts}}</div>
<form id="assistantForm" class="chat-input">
<label class="sr-only" for="chatText">Consulta del equipo</label>
<input id="chatText" placeholder="Pregunta sobre tu proyecto…" maxlength="500" required>
<button class="btn primary">Enviar</button>
</form>
</section>
