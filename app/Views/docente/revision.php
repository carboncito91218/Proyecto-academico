<button class="back" data-action="nav" data-id="received">{{back}} Propuestas recibidas</button>{{heading}}<div class="grid-2">
<div class="stack">
<section class="card">
<div class="card-title">
<h2>{{title}}</h2>{{proposalIcon}}</div>
<p class="description">{{description}}</p>
<div class="divider">
</div>
<h3>Integrantes y matrículas</h3>{{members}}</section>
<section class="card">
<div class="card-title">
<h2>Rúbricas destinatarias</h2>
<span class="small muted">{{count}} rúbricas</span>
</div>{{rubrics}}</section>
</div>
<aside class="stack sticky">
<section class="card">
<span class="eyebrow">TU RÚBRICA</span>
<h2 style="margin-top:9px">{{rubricTitle}}</h2>
<p class="small muted" style="margin-top:7px">{{course}}</p>
{{participants}}
<div class="divider">
</div>{{competencies}}<h3>Criterios del profesor</h3>
<p class="criteria" style="margin-top:10px">{{criteria}}</p>
<div class="divider">
</div>{{feedback}}<div class="stack">{{approve}}{{observe}}{{reject}}</div>
<p class="small muted" style="margin-top:16px">Observaciones realizadas · {{observations}} de 2.</p>
</section>{{history}}{{guidance}}</aside>
</div>
