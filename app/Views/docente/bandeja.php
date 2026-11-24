{{heading}}<div class="filterbar">
<div class="filter">
<label for="rubricFilter">Rúbrica</label>
<select id="rubricFilter">
<option value="">Todas mis rúbricas</option>{{rubrics}}</select>
<label for="decisionFilter">Decisión</label>
<select id="decisionFilter">
<option value="">Todas las decisiones</option>{{statuses}}</select>
</div>
<span class="small muted">{{count}} resultados</span>
</div>
<div class="table-wrap" {{tableHidden}}>
    <table>
        <thead><tr><th>Propuesta / equipo</th><th>Tu rúbrica</th><th>Envío</th><th>Tu decisión</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>{{rows}}</tbody>
    </table>
</div>
{{emptyState}}
