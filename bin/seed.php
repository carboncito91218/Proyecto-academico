<?php
declare(strict_types=1);
$config = require dirname(__DIR__) . '/bootstrap.php';
use App\Models\{Connection,Transaction,RubricRepository};

// IDs externos compatibles con los registros de los pasos anteriores. Todas las personas son ficticias.
$students = [
    ['s1','Lucía Salazar Montes','lucia.salazar@isur.edu.pe','dsi',3,['c1','c2']],
    ['s2','Mateo Rivas León','mateo.rivas@isur.edu.pe','dsi',3,['c2','c3']],
    ['s3','Valeria Paredes Soto','valeria.paredes@isur.edu.pe','dsi',2,['c1']],
    ['s4','Diego Cárdenas Ruiz','diego.cardenas@isur.edu.pe','adm',3,['c1']],
    ['s5','Camila Torres Vidal','camila.torres@isur.edu.pe','dsi',4,['c2']],
    ['s6','Andrés Medina Flores','andres.medina@isur.edu.pe','adm',2,['c4','c5']],
];
$teachers = [
    ['t1','Elena Vargas Peña','elena.vargas@isur.edu.pe',['c1','c2']],
    ['t2','Javier Núñez Ramos','javier.nunez@isur.edu.pe',['c2','c3']],
    ['t3','Sofía Benavides Gil','sofia.benavides@isur.edu.pe',['c1','c3','c4']],
];
$courses = [
    ['c1','Programación web','dsi',3], ['c2','Base de datos','dsi',3],
    ['c3','Diseño de interfaces','dsi',3], ['c4','Gestión empresarial','adm',2],
    ['c5','Procesos administrativos','adm',2],
];
function seedId(string $key): string
{
    $hex = substr(hash('sha256',$key),0,32);
    return substr($hex,0,8) . '-' . substr($hex,8,4) . '-5' . substr($hex,13,3) . '-a' . substr($hex,17,3) . '-' . substr($hex,20,12);
}
try {
    if ($config['environment'] !== 'development') throw new RuntimeException('La semilla de demostración requiere environment=development.');
    $options = getopt('', ['period:','start:','expiry:','grades:','deadline:']);
    $period = $options['period'] ?? $config['academic_period'];
    $defaults = $period === '2026-2' ? ['start'=>'2026-08-17','expiry'=>'2026-12-04','grades'=>'2026-12-22','deadline'=>'2026-12-02'] : [];
    $dates = [];
    foreach (['start','expiry','grades','deadline'] as $field) {
        $value = $options[$field] ?? $defaults[$field] ?? '';
        $date = DateTimeImmutable::createFromFormat('!Y-m-d',$value);
        if (!$date || $date->format('Y-m-d') !== $value) throw new RuntimeException('Indica --start, --expiry, --grades y --deadline con fechas válidas para el periodo elegido.');
        $dates[$field] = $value;
    }
    if (!($dates['start'] < $dates['expiry'] && $dates['expiry'] <= $dates['grades'] && $dates['deadline'] >= $dates['start'] && $dates['deadline'] < $dates['expiry'])) {
        throw new RuntimeException('Fechas incoherentes. El plazo debe quedar dentro del periodo y antes de su caducidad.');
    }
    $password = $config['demo_password'] ?? '';
    if (!is_string($password) || strlen($password) < 12) throw new RuntimeException('Configura demo_password con al menos 12 caracteres en config/local.php antes de ejecutar la semilla.');
    $pdo = Connection::open($config['database']);
    Transaction::run($pdo,function() use($pdo,$period,$dates,$students,$teachers,$courses,$password) {
        $run = function(string $sql, array $parameters = []) use($pdo): PDOStatement {
            $query = $pdo->prepare($sql);
            $query->execute($parameters);
            return $query;
        };
        $stored = $run('SELECT inicio,caducidad,limite_notas FROM periodos_academicos WHERE id=?',[$period])->fetch();
        if ($stored && [$stored['inicio'],$stored['caducidad'],$stored['limite_notas']] !== [$dates['start'],$dates['expiry'],$dates['grades']]) {
            throw new RuntimeException('El periodo ya existe con otras fechas. Se conserva. Elige un nuevo ID de periodo para fechas nuevas.');
        }
        if (!$stored && $dates['expiry'] <= date('Y-m-d')) throw new RuntimeException('El periodo de demostración ha vencido. Elige explícitamente otro periodo y sus fechas.');
        $run('INSERT INTO periodos_academicos(id,inicio,caducidad,limite_notas) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING',[$period,$dates['start'],$dates['expiry'],$dates['grades']]);
        foreach (['dsi'=>'Desarrollo de Sistemas de Información','adm'=>'Administración'] as $id=>$name) {
            $run('INSERT INTO carreras(id,nombre) VALUES (?,?) ON CONFLICT(id) DO NOTHING',[$id,$name]);
        }
        foreach ($courses as $course) $run('INSERT INTO cursos(id,nombre,carrera_id,ciclo) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING',$course);
        foreach ($students as [$id,$name,$email,$program,$cycle,$enrollment]) {
            $run("INSERT INTO personas(id,nombre,tipo,correo) VALUES (?,?,'alumno',?) ON CONFLICT(id) DO NOTHING",[$id,$name,$email]);
            $run('INSERT INTO alumnos(persona_id,carrera_id,ciclo) VALUES (?,?,?) ON CONFLICT(persona_id) DO NOTHING',[$id,$program,$cycle]);
            // Una matrícula ya preparada para este alumno/periodo se conserva completa.
            if (!$run('SELECT 1 FROM matriculas WHERE alumno_id=? AND periodo_id=? LIMIT 1',[$id,$period])->fetchColumn()) {
                foreach ($enrollment as $course) $run('INSERT INTO matriculas(alumno_id,curso_id,periodo_id) VALUES (?,?,?) ON CONFLICT DO NOTHING',[$id,$course,$period]);
            }
        }
        foreach ($teachers as [$id,$name,$email,$teaching]) {
            $run("INSERT INTO personas(id,nombre,tipo,correo) VALUES (?,?,'profesor',?) ON CONFLICT(id) DO NOTHING",[$id,$name,$email]);
            $run('INSERT INTO docentes(persona_id) VALUES (?) ON CONFLICT DO NOTHING',[$id]);
            if (!$run('SELECT 1 FROM docencia_curso WHERE docente_id=? AND periodo_id=? LIMIT 1',[$id,$period])->fetchColumn()) {
                foreach ($teaching as $course) $run('INSERT INTO docencia_curso(docente_id,curso_id,periodo_id) VALUES (?,?,?) ON CONFLICT DO NOTHING',[$id,$course,$period]);
            }
        }
        $missing = $run("SELECT id FROM (SELECT profesor_id AS id FROM rubricas UNION SELECT lider_id FROM equipos UNION SELECT alumno_id FROM equipo_integrantes UNION SELECT usuario_id FROM notificacion_destinatarios) refs WHERE NOT EXISTS(SELECT 1 FROM personas p WHERE p.id=refs.id)")->fetchAll(PDO::FETCH_COLUMN);
        $missingCourses = $run('SELECT DISTINCT curso_id FROM rubricas r WHERE NOT EXISTS(SELECT 1 FROM cursos c WHERE c.id=r.curso_id)')->fetchAll(PDO::FETCH_COLUMN);
        if ($missing || $missingCourses) throw new RuntimeException('Hay referencias académicas anteriores sin importar. Se conserva todo y se revierte la semilla. Completa las personas/cursos antes de continuar.');
        foreach (array_merge(array_column($students,0),array_column($teachers,0)) as $id) {
            if (!$run('SELECT 1 FROM accesos WHERE persona_id=?',[$id])->fetchColumn()) {
                $run('INSERT INTO accesos(persona_id,password_hash,solo_desarrollo) VALUES (?,?,true) ON CONFLICT DO NOTHING',[$id,password_hash($password,PASSWORD_DEFAULT)]);
            }
        }
        $repository = new RubricRepository($pdo);
        $samples = [
            ['web','t1','c1','Aplicación web para servicios del campus','Diseño funcional, implementación y justificación técnica de una solución web. Se revisan claridad, funcionamiento y documentación.',['Diseñar un flujo web accesible','Implementar y justificar la solución']],
            ['datos','t2','c2','Modelo de datos del proyecto','Modelo relacional consistente, integridad y consultas que sostengan el caso de uso. Los criterios y pesos quedan al juicio del docente.',['Diseñar un esquema normalizado','Aplicar restricciones y consultas verificables']],
            ['interfaz','t3','c3','Experiencia de usuario del proyecto','Prototipo y diseño coherente, navegación comprensible y validación de tareas con usuarios de prueba.',['Definir tareas y navegación','Diseñar interfaces accesibles']],
        ];
        foreach ($samples as [$key,$teacher,$course,$title,$criteria,$competencies]) {
            $id = seedId('rubrica-demo|' . $period . '|' . $key);
            if ($repository->get($id)) continue;
            if ($dates['deadline'] < date('Y-m-d')) throw new RuntimeException('El plazo de las nuevas rúbricas de semilla ya venció. Indica --deadline explícitamente o prepara otro periodo.');
            $repository->save(['id'=>$id,'teacher'=>$teacher,'course'=>$course,'title'=>$title,'criteria'=>$criteria,'deadline'=>$dates['deadline'],
                'competencies'=>$competencies,'competencyIds'=>[seedId($id . '|0'),seedId($id . '|1')],'version'=>1],true);
            $repository->record(['id'=>$teacher],$repository->get($id),'SEMILLA',null);
        }
    });
    echo 'Semilla preparada para ' . $period . '. Las cuentas, matrículas y rúbricas existentes se conservan.' . PHP_EOL;
    echo 'Consulta los correos de demostración en README.md y la clave en config/local.php, campo demo_password.' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR,$error instanceof PDOException ? 'No se pudo completar la semilla (SQLSTATE ' . $error->getCode() . '). Se revirtió la operación.' . PHP_EOL : $error->getMessage() . PHP_EOL);
    exit(1);
}
