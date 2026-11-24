import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const base = process.argv[2] || 'http://127.0.0.1:8000';
const root = fileURLToPath(new URL('../../', import.meta.url));
const realFetch = globalThis.fetch;
let cookie = '';
let lastStatus;
const ids = [];
// Ejecuta el adaptador entregado, usando la URL HTTP del servidor y su cookie de sesión.
globalThis.fetch = async (url, options = {}) => {
    const target = new URL(url);
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    const actual = target.protocol === 'file:' ? new URL(`/api.php${target.search}`, base) : target;
    const response = await realFetch(actual, { ...options, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    lastStatus = response.status;
    const body = await response.arrayBuffer();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
};
globalThis.document = { body: { dataset: { mode: 'live' } } };
const api = await import('../../public/src/data/http-adapter.js');
const adapter = await import('../../public/src/data/adapter.js');
function ok(label) { console.log(`OK ${label}`); }
async function reject(operation, status, label) {
    await assert.rejects(operation);
    assert.equal(lastStatus,status);
    ok(`${label} HTTP ${status}`);
}
async function raw(operation, data, csrf = '') {
    return globalThis.fetch(new URL(`/api.php?op=${operation}`,base), {
        method:data === undefined ? 'GET' : 'POST',
        headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
        body:data === undefined ? undefined : JSON.stringify(data)
    });
}
try {
    await reject(()=>adapter.read(),401,'Sesión requerida');
    const info = await api.session();
    assert.ok(info.profileOptions.some(p=>p.id === 't1'));
    const invalidCsrf = await raw('profile',{id:'t1'},'incorrecto');
    assert.equal(invalidCsrf.status,403); ok('CSRF de selector');
    await api.selectProfile('t1');
    let snapshot = await adapter.read();
    assert.equal(snapshot.profile,'t1');
    assert.equal(snapshot.demo,false);
    assert.ok(snapshot.rubrics.every(r=>r.teacher === 't1'));
    ok('Profesor de sesión y adaptador real');
    const title = `Verificación HTTP ${Date.now()}`;
    const expiry = snapshot.periodo.caducidad;
    const deadline = new Date(Date.parse(expiry+'T12:00:00Z')-86400000).toISOString().slice(0,10);
    const input = {title,criteria:'Texto libre con criterios y pesos',course:'c3',competencies:['Analizar','Verificar'],deadline,teacher:'t2',role:'alumno'};
    const csrf = snapshot.csrf;
    const bad = await raw('saveRubric',input,'incorrecto');
    assert.equal(bad.status,403); ok('CSRF de mutación');
    for (const invalid of [{course:'inexistente'},{competencies:[]},{deadline:'2026-02-30'}]) {
        await reject(()=>adapter.execute('saveRubric',{...input,...invalid}),422,'Datos inválidos rechazados');
    }
    const created = await adapter.execute('saveRubric',input);
    const id = created.result; ids.push(id);
    const saved = created.snapshot.rubrics.find(r=>r.id === id);
    assert.equal(saved.teacher,'t1'); assert.equal(saved.competencyIds.length,2);
    const reload = await adapter.read();
    assert.deepEqual(reload.rubrics.find(r=>r.id === id),saved);
    ok('Creación y nueva lectura con los mismos IDs');
    const detail = await raw('detail&id='+encodeURIComponent(id));
    assert.equal(detail.status,200); assert.equal((await detail.json()).id,id);
    ok('Detalle HTTP');
    const switched = await adapter.execute('profile','s1');
    assert.equal(switched.snapshot.profile,'s1');
    assert.equal(switched.snapshot.students.length,1);
    assert.ok(switched.snapshot.courses.some(c=>c.id === 'c3'));
    const open = saved.deadline >= switched.snapshot.date && switched.snapshot.date < expiry;
    assert.equal(switched.snapshot.rubrics.some(r=>r.id === id),open);
    ok('Catálogo de alumno con cursos fuera de su matrícula');
    await reject(()=>adapter.execute('saveRubric',input),403,'Alumno creando');
    await reject(()=>adapter.execute('saveRubric',{...input,id}),403,'Alumno editando');
    await adapter.execute('profile','t2');
    await reject(()=>adapter.execute('saveRubric',{...input,id}),403,'Profesor ajeno editando');
    await reject(()=>adapter.execute('saveRubric',{id,remove:true}),403,'Profesor ajeno eliminando');
    await adapter.execute('profile','t1');
    const expired = '2000-01-01';
    await adapter.execute('saveRubric',{...input,id,version:saved.version,deadline:expired});
    snapshot = await adapter.read();
    assert.equal(snapshot.rubrics.find(r=>r.id === id).deadline,expired);
    await adapter.execute('profile','s1');
    assert.ok(!(await adapter.read()).rubrics.some(r=>r.id === id));
    ok('Vencida excluida del catálogo');
    await adapter.execute('profile','t1');
    snapshot = await adapter.read();
    await adapter.execute('saveRubric',{...input,id,version:snapshot.rubrics.find(r=>r.id === id).version,deadline});
    const fresh = await adapter.execute('profile','s1');
    assert.equal(fresh.snapshot.rubrics.some(r=>r.id === id),open);
    ok('Prórroga reflejada sin localStorage');
    await adapter.execute('profile','t1');
    await adapter.execute('saveRubric',{id,remove:true});
    assert.ok(!(await adapter.read()).rubrics.some(r=>r.id === id));
    ok('Eliminación HTTP');
    for (const path of ['/','/demo.php','/assets/base.css','/src/app.js','/src/data/http-adapter.js']) {
        assert.equal((await globalThis.fetch(new URL(path,base))).status,200);
    }
    ok('Entrada, demo y recursos HTTP');
    const publicConfig = await globalThis.fetch(new URL('/config/local.php',base));
    assert.ok((await publicConfig.text()).includes('data-mode="live"'));
    ok('Ruta privada devuelve el portal público, sin configuración');
} finally {
    // Solo se retiran los registros creados por esta ejecución. Nunca toca datos anteriores.
    const cleanup = spawnSync('php',['-r',`
        $config=require 'bootstrap.php';
        $pdo=App\\Repositories\\Connection::open($config['database']);
        $pdo->beginTransaction();
        foreach (json_decode(stream_get_contents(STDIN),true) as $id) {
            if (!App\\Domain\\Id::valid($id)) throw new RuntimeException('ID inválido');
            $q=$pdo->prepare('DELETE FROM rubricas WHERE id=?');$q->execute([$id]);
            $q=$pdo->prepare("DELETE FROM historial WHERE entidad='rubrica' AND entidad_id=?");$q->execute([$id]);
        }
        $pdo->commit();
    `],{cwd:root,input:JSON.stringify(ids),encoding:'utf8'});
    if (cleanup.status !== 0) throw new Error('Falló limpieza de pruebas HTTP. Revisar UUID de la ejecución.');
    ok('Limpieza de datos e historial de esta prueba');
}
