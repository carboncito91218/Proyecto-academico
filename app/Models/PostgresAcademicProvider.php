<?php
declare(strict_types=1);
namespace App\Models;
use PDO;
use RuntimeException;
final class PostgresAcademicProvider implements AcademicProvider
{
    private array $dates;

    public function __construct(private PDO $pdo, private string $periodId)
    {
        $query = $pdo->prepare('SELECT id,inicio,caducidad,limite_notas FROM periodos_academicos WHERE id=?');
        $query->execute([$periodId]);
        $period = $query->fetch();
        if (!$period) throw new RuntimeException('Periodo académico no preparado. Ejecuta la semilla explícita y revisa academic_period en config/local.php.');
        $this->dates = ['id'=>$period['id'],'inicio'=>$period['inicio'],'caducidad'=>$period['caducidad'],'limiteNotas'=>$period['limite_notas']];
    }

    private function people(string $where = '', array $parameters = []): array
    {
        $query = $this->pdo->prepare('SELECT p.id,p.nombre,p.tipo,a.ciclo,c.nombre AS carrera FROM personas p LEFT JOIN alumnos a ON a.persona_id=p.id LEFT JOIN carreras c ON c.id=a.carrera_id ' . $where . ' ORDER BY p.id');
        $query->execute($parameters);
        $people = [];
        foreach ($query->fetchAll() as $row) {
            $person = ['id'=>$row['id'],'name'=>$row['nombre'],'role'=>$row['tipo']];
            if ($row['tipo'] === 'alumno') {
                if ($row['carrera'] === null) throw new RuntimeException('Alumno sin carrera configurada.');
                $person['program'] = $row['carrera'];
                $person['cycle'] = (int)$row['ciclo'];
                $person['courseIds'] = $this->enrollment($row['id']);
            }
            $people[] = $person;
        }
        return $people;
    }

    public function identities(): array { return $this->people(); }

    public function identity(string $id): array
    {
        return $this->people('WHERE p.id=?',[$id])[0] ?? throw new RuntimeException('Identidad desconocida.');
    }

    public function student(string $id): array
    {
        $person = $this->identity($id);
        if ($person['role'] !== 'alumno') throw new RuntimeException('La identidad no es alumno.');
        return $person;
    }

    public function candidates(string $program, string $query = ''): array
    {
        return $this->people("WHERE p.tipo='alumno' AND c.nombre=? AND p.nombre ILIKE ?",[$program,'%' . $query . '%']);
    }

    public function enrollment(string $id): array
    {
        $query = $this->pdo->prepare('SELECT curso_id FROM matriculas WHERE alumno_id=? AND periodo_id=? ORDER BY curso_id');
        $query->execute([$id,$this->periodId]);
        return $query->fetchAll(PDO::FETCH_COLUMN);
    }

    public function courses(): array
    {
        return $this->pdo->query('SELECT id,nombre AS name,ciclo AS cycle FROM cursos ORDER BY id')->fetchAll();
    }

    public function period(): array { return $this->dates; }
}
