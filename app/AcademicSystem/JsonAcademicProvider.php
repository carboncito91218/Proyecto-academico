<?php
declare(strict_types=1);
namespace App\AcademicSystem;
use App\Domain\AcademicProvider;
use RuntimeException;
final class JsonAcademicProvider implements AcademicProvider
{
    private array $people = [];
    private array $courseList;
    private array $dates;
    public function __construct(string $path)
    {
        if (!is_readable($path)) throw new RuntimeException('Archivo académico no disponible.');
        try { $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('JSON académico inválido.'); }
        foreach (['students', 'teachers', 'courses', 'periodo'] as $key) {
            if (!isset($data[$key]) || !is_array($data[$key])) throw new RuntimeException("Falta colección académica $key.");
        }
        $courses = [];
        foreach ($data['courses'] as $course) {
            if (!is_string($course['id'] ?? null) || !is_string($course['name'] ?? null) || isset($courses[$course['id']])) throw new RuntimeException('Curso inválido o duplicado.');
            $courses[$course['id']] = ['id' => $course['id'], 'name' => $course['name']];
        }
        $this->courseList = array_values($courses);
        foreach (['students' => 'alumno', 'teachers' => 'profesor'] as $collection => $role) {
            foreach ($data[$collection] as $person) {
                if (!is_string($person['id'] ?? null) || !is_string($person['name'] ?? null) || isset($this->people[$person['id']])) throw new RuntimeException('Identidad inválida o duplicada.');
                $normalized = ['id' => $person['id'], 'name' => $person['name'], 'role' => $role];
                if ($role === 'alumno') {
                    if (!is_string($person['program'] ?? null) || !is_array($person['courses'] ?? null)) throw new RuntimeException('Carrera o matrícula inválida.');
                    foreach ($person['courses'] as $id) {
                        if (!is_string($id) || !isset($courses[$id])) throw new RuntimeException('Matrícula con curso desconocido.');
                    }
                    $normalized['program'] = $person['program'];
                    $normalized['courseIds'] = array_values(array_unique($person['courses']));
                }
                $this->people[$person['id']] = $normalized;
            }
        }
        foreach (['inicio', 'caducidad', 'limiteNotas'] as $key) {
            $value = $data['periodo'][$key] ?? '';
            if (!is_string($value) || !($date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value)) || $date->format('Y-m-d') !== $value) throw new RuntimeException('Fecha académica inválida.');
        }
        $this->dates = $data['periodo'];
    }
    public function identities(): array { return array_values($this->people); }
    public function identity(string $id): array { return $this->people[$id] ?? throw new RuntimeException('Identidad desconocida.'); }
    public function student(string $id): array
    {
        $person = $this->identity($id);
        if ($person['role'] !== 'alumno') throw new RuntimeException('La identidad no es alumno.');
        return $person;
    }
    public function candidates(string $program, string $query = ''): array
    {
        return array_values(array_filter($this->people, fn($p) => $p['role'] === 'alumno' && $p['program'] === $program && stripos($p['name'], $query) !== false));
    }
    public function enrollment(string $id): array { return $this->student($id)['courseIds']; }
    public function courses(): array { return $this->courseList; }
    public function period(): array { return $this->dates; }
}
