<?php
declare(strict_types = 1);
namespace App\Services;
use App\Models\{AcademicProvider, Id, RuleViolation, Transaction, ProposalRepository, RubricRepository};
use PDO;
final class ProposalService
{
    private ProposalRepository $proposals;
    private RubricRepository $rubrics;
    public function __construct(private PDO $pdo, private AcademicProvider $academic, private ?\Closure $clock = null)
    {
        $this->proposals = new ProposalRepository($pdo);
        $this->rubrics = new RubricRepository($pdo);
    }
    public function today(): string
    {
        return $this->clock ? ($this->clock)() : (new \DateTimeImmutable())->format('Y-m-d');
    }

    private function periodOpen(): void
    {
        if ($this->today() >= $this->academic->period()['caducidad']) throw new RuleViolation('El periodo de revisión ya caducó.', 409);
    }
    private function id(mixed $id): string
    {
        if (!Id::valid($id)) throw new RuleViolation('Identificador inválido.');
        return $id;
    }
    private function ids(mixed $values): array
    {
        if (!is_array($values) || !array_is_list($values)) throw new RuleViolation('La selección debe ser una lista.');
        foreach ($values as $id) $this->id($id);
        if (count(array_unique($values)) !== count($values)) throw new RuleViolation('No repitas rúbricas en la selección.');
        return $values;
    }
    private function text(array $input, string $field): string
    {
        $value = $input[$field] ?? '';
        if (!is_string($value)) throw new RuleViolation('Texto inválido en ' . $field . '.');
        return trim($value);
    }
    private function version(array $proposal, array $input): void
    {
        if (($input['version'] ?? null) !== $proposal['version']) throw new RuleViolation('La propuesta cambió. Recarga la pantalla y revisa los cambios antes de continuar.', 409);
    }
    private function editable(array $proposal): void
    {
        if ($proposal['confirmed'] || $proposal['status'] === 'RECHAZADA') throw new RuleViolation('La propuesta está cerrada para modificaciones.', 409);
    }
    private function leader(array $actor, array $proposal): void
    {
        if ($actor['role'] !== 'alumno' || $actor['id'] !== $proposal['leader']) throw new RuleViolation('Solo el líder puede modificar esta propuesta.', 403);
    }
    private function student(string $id): array
    {
        try { return $this->academic->student($id); }
        catch (\RuntimeException $e) { throw new RuleViolation('Alumno externo inexistente.'); }
    }
    private function applicable(array $student, array $leader, array $rubrics): bool
    {
        return $student['program'] === $leader['program'] && (bool)array_intersect($student['courseIds'], array_column($rubrics, 'course'));
    }
    private function team(string $leaderId, array $requested, array $rubrics, array $previous = [], bool $prune = false): array
    {
        if (!array_is_list($requested)) throw new RuleViolation('Integrantes inválidos.');
        $leader = $this->student($leaderId);
        if (!$this->applicable($leader, $leader, $rubrics)) throw new RuleViolation('El líder necesita matrícula en al menos un curso elegido.');
        foreach ($requested as $id) if (!is_string($id)) throw new RuleViolation('Integrante inválido.');
        $members = [];
        $removed = [];
        foreach (array_unique(array_merge([$leaderId], $requested)) as $id) {
            if (!is_string($id)) throw new RuleViolation('Integrante inválido.');
            $student = $this->student($id);
            if (!$this->applicable($student, $leader, $rubrics)) {
                if (!$prune || !in_array($id, $previous, true)) throw new RuleViolation('Cada integrante debe pertenecer a la misma carrera y cursar un curso aplicable.');
                $removed[] = $student['name'];
            } else $members[] = $id;
        }
        return [$members, $removed];
    }
    private function coverage(array $members, array $rubrics): void
    {
        $courses = [];
        foreach ($members as $id) $courses = array_merge($courses, $this->student($id)['courseIds']);
        foreach ($rubrics as $rubric) {
            if (!in_array($rubric['course'], $courses, true)) throw new RuleViolation('Falta un integrante matriculado para «' . $rubric['title'] . '».');
        }
    }
    private function selected(array $ids, bool $new, array $existing = []): array
    {
        if (!$ids) throw new RuleViolation('Elige al menos una rúbrica para el borrador.');
        $rubrics = [];
        foreach ($ids as $id) {
            $rubric = $this->rubrics->get($id, true);
            if (!$rubric) throw new RuleViolation('Una rúbrica elegida ya no existe.', 409);
            if (($new || !in_array($id, $existing, true)) && $rubric['deadline'] < $this->today()) throw new RuleViolation('Recepción cerrada para «' . $rubric['title'] . '».');
            $rubrics[] = $rubric;
        }
        return $rubrics;
    }
    public function candidates(array $actor, array $input): array
    {
        if ($actor['role'] !== 'alumno') throw new RuleViolation('La búsqueda de integrantes corresponde al alumno.', 403);
        return Transaction::run($this->pdo, function() use($actor, $input) {
            $existing = [];
            if (isset($input['id'])) {
                $proposal = $this->proposals->get($this->id($input['id']));
                $this->leader($actor, $proposal);
                $existing = array_column($proposal['relations'], 'rubric');
            }
            $rubrics = $this->selected($this->ids($input['rubrics'] ?? null), false, $existing);
            $leader = $this->student($actor['id']);
            return array_values(array_filter($this->academic->candidates($leader['program'], $this->text($input, 'query')), fn($s) => $this->applicable($s, $leader, $rubrics)));
        });
    }
    public function save(array $actor, array $input): array
    {
        if ($actor['role'] !== 'alumno') throw new RuleViolation('Solo un alumno puede crear o corregir propuestas.', 403);
        $this->expire();
        return Transaction::run($this->pdo, function() use($actor, $input) {
            $this->periodOpen();
            $mode = $input['mode'] ?? '';
            if (!in_array($mode, ['draft', 'send'], true)) throw new RuleViolation('Modo de guardado inválido.');
            $id = $input['id'] ?? null;
            $before = $id === null ? null : $this->proposals->get($this->id($id), true);
            if ($before) {
                $this->leader($actor, $before);
                $this->editable($before);
                $this->version($before, $input);
                if (!$before['draft'] && $mode !== 'send') throw new RuleViolation('Una propuesta enviada no vuelve a borrador.', 409);
            }
            $ids = $this->ids($input['rubrics'] ?? null);
            $existing = array_column(array_filter($before['relations'] ?? [], fn($r) => !$r['withdrawn']), 'rubric');
            if ($before && !$before['draft']) {
                $sorted = $ids;
                $old = $existing;
                sort($sorted);
                sort($old);
                if ($sorted !== $old) throw new RuleViolation('Una propuesta enviada conserva sus vínculos. Usa la acción de retirada para vínculos terminales.', 409);
            }
            $rubrics = $this->selected($ids, !$before || $before['draft'], $existing);
            if (!is_array($input['members'] ?? null)) throw new RuleViolation('Indica el equipo.');
            [$members, $removed] = $this->team($actor['id'], $input['members'], $rubrics, $before['members'] ?? [], $before !== null && $ids !== $existing);
            $title = $this->text($input, 'title');
            $description = $this->text($input, 'description');
            if ($mode === 'send') {
                if (count($ids) < 2) throw new RuleViolation('El envío requiere al menos dos rúbricas.');
                if ($title === '' || $description === '') throw new RuleViolation('Completa título y descripción.');
                $this->coverage($members, $rubrics);
            }
            $evidence = $input['evidence'] ?? [];
            if (!is_array($evidence)) throw new RuleViolation('Sustentos inválidos.');
            $team = $before['teamId'] ?? Id::new();
            $id ??= Id::new();
            if (!$before) $this->proposals->create($id, $team, $actor['id']);
            $proposal = $before ?? $this->proposals->get($id);
            $proposal['title'] = $title;
            $proposal['description'] = $description;
            $proposal['members'] = $members;
            $proposal['version'] = ($before['version'] ?? 0)+1;
            $proposal['contentVersion'] = ($before['contentVersion'] ?? 0)+1;
            $this->proposals->saveContent($proposal, $mode === 'send');
            foreach ($before['relations'] ?? [] as $link) {
                if ($before['draft'] && !in_array($link['rubric'], $ids, true)) $this->proposals->removeDraftLink($link['id']);
            }
            foreach ($rubrics as $rubric) {
                $old = null;
                foreach ($proposal['relations'] as $relation) if ($relation['rubric'] === $rubric['id']) $old = $relation;
                if ($old && in_array($old['decision'], ['RECHAZADA', 'CADUCADA'], true)) continue;
                $linkId = $old['id'] ?? $this->proposals->addLink($id, $rubric['id']);
                $link = $old ?? ['id' => $linkId, 'rubric' => $rubric['id']];
                $proof = $evidence[$rubric['id']] ?? [];
                if (!is_array($proof)) throw new RuleViolation('Sustento inválido.');
                foreach ($rubric['competencyIds'] as $competency) {
                    $text = $proof[$competency] ?? '';
                    if (!is_string($text)) throw new RuleViolation('El sustento debe ser texto.');
                    if ($mode === 'send' && trim($text) === '') throw new RuleViolation('Completa el sustento de cada competencia de «' . $rubric['title'] . '».');
                    $this->proposals->evidence($link, $competency, trim($text), ($old['decision'] ?? '') !== 'APROBADA');
                }
                $corrected = ($old['decision'] ?? '') === 'OBSERVADA';
                if ($corrected) {
                    $link['decision'] = 'PENDIENTE';
                    $link['feedback'] = '';
                    $link['reviewedVersion'] = null;
                    $this->proposals->updateLink($link);
                }
                $label = $mode === 'draft' ? 'Borrador guardado' : ($corrected ? 'Corrección reenviada' : ($before && !$before['draft'] ? 'Propuesta actualizada' : 'Propuesta enviada'));
                $this->proposals->history($actor, $proposal, 'propuesta_rubrica', $linkId, $label, ['before' => $old, 'evidence' => $proof, 'note' => 'Versión de contenido ' . $proposal['contentVersion']]);
                if ($mode === 'send') $this->proposals->notice($proposal, $link, 'send', $label, [$rubric['teacher']]);
            }
            $this->proposals->history($actor, $proposal, 'propuesta', $id, 'Contenido guardado', ['before' => $before, 'note' => implode(', ', $removed)]);
            $this->proposals->recalculate($id);
            return ['id' => $id, 'removed' => $removed];
        });
    }
    public function review(array $actor, array $input): string
    {
        if ($actor['role'] !== 'profesor') throw new RuleViolation('Solo el profesor responsable puede revisar.', 403);
        $this->expire();
        return Transaction::run($this->pdo, function() use($actor, $input) {
            $this->periodOpen();
            $proposal = $this->proposals->get($this->id($input['pid'] ?? null), true);
            $link = null;
            foreach ($proposal['relations'] as $relation) if ($relation['id'] === ($input['linkId'] ?? null)) $link = $relation;
            if (!$link) throw new RuleViolation('El vínculo no pertenece a la propuesta.', 404);
            $rubric = $this->rubrics->get($link['rubric'], true);
            if ($rubric['teacher'] !== $actor['id']) throw new RuleViolation('Este vínculo corresponde a otro profesor.', 403);
            $this->version($proposal, $input);
            $this->editable($proposal);
            if ($proposal['draft'] || $link['withdrawn'] || in_array($link['decision'], ['RECHAZADA', 'CADUCADA', 'OBSERVADA'], true)) throw new RuleViolation('El vínculo no admite revisión en su estado actual.', 409);
            $this->proposals->bump($proposal);
            if (isset($input['competencyId'])) {
                $competency = $this->id($input['competencyId']);
                if (!in_array($competency, $rubric['competencyIds'], true)) throw new RuleViolation('La competencia pertenece a otra rúbrica.');
                $value = $input['value'] ?? null;
                if (!in_array($value, ['', 'CUMPLE', 'NO_CUMPLE'], true)) throw new RuleViolation('Verificación inválida.');
                $this->proposals->verify($link['id'], $competency, $value === '' ? null : $value);
                $this->proposals->history($actor, $proposal, 'propuesta_rubrica', $link['id'], 'Competencia verificada', ['competency' => $competency, 'value' => $value, 'note' => 'Versión de contenido ' . $proposal['contentVersion']]);
                return $proposal['id'];
            }
            foreach ($rubric['competencyIds'] as $competency) if (empty($link['verification'][$competency])) throw new RuleViolation('Verifica cada competencia antes de decidir.');
            $decision = $input['decision'] ?? '';
            if (!in_array($decision, ['APROBADA', 'OBSERVADA', 'RECHAZADA'], true)) throw new RuleViolation('Decisión inválida.');
            if ($link['decision'] === 'APROBADA' && $decision !== 'APROBADA' && $proposal['born']) {
                $approvals = count(array_filter($proposal['relations'], fn($r) => !$r['withdrawn'] && $r['decision'] === 'APROBADA'));
                if ($approvals <= 2) throw new RuleViolation('La revocación dejaría el proyecto con menos de dos aprobaciones. Esta transición está bloqueada hasta definir su tratamiento.', 409);
            }
            $before = $link;
            $link['feedback'] = $this->text($input, 'feedback');
            $link['start'] = null;
            $link['end'] = null;
            $link['delivery'] = null;
            $link['deliveryDate'] = null;
            if ($decision === 'APROBADA') {
                $link['start'] = $this->date($input, 'start');
                $link['end'] = $this->date($input, 'end');
                if ($link['end'] < $link['start']) throw new RuleViolation('La fecha de fin debe ser igual o posterior al inicio.');
                $name = $this->text($input, 'delivery');
                $day = $this->text($input, 'deliveryDate');
                if ($name !== '' || $day !== '') {
                    $day = $this->date($input, 'deliveryDate');
                    if ($name === '' || $day < $link['start'] || $day > $link['end']) throw new RuleViolation('El entregable necesita nombre y fecha dentro del rango de la rúbrica.');
                    $link['delivery'] = $name;
                    $link['deliveryDate'] = $day;
                } elseif ($before['delivery']) {
                    if ($before['deliveryDate'] < $link['start'] || $before['deliveryDate'] > $link['end']) throw new RuleViolation('Las nuevas fechas deben incluir el entregable existente.');
                    $link['delivery'] = $before['delivery'];
                    $link['deliveryDate'] = $before['deliveryDate'];
                }
            } else {
                if ($link['feedback'] === '') throw new RuleViolation('Observar o rechazar requiere feedback.');
                if ($decision === 'OBSERVADA') {
                    if ($link['observations'] >= 2) throw new RuleViolation('Ya hubo dos observaciones. Solo puedes aprobar o rechazar.', 409);
                    $link['observations']++;
                }
            }
            $link['decision'] = $decision;
            $link['reviewedVersion'] = $proposal['contentVersion'];
            $this->proposals->updateLink($link);
            $this->proposals->history($actor, $proposal, 'propuesta_rubrica', $link['id'], $decision, ['before' => $before, 'after' => $link, 'note' => $link['feedback'] ?: $link['start'] . ' / ' . $link['end']]);
            $this->proposals->notice($proposal, $link, 'decision', 'Rúbrica ' . strtolower($decision), $proposal['members']);
            $this->proposals->recalculate($proposal['id']);
            return $proposal['id'];
        });
    }
    private function date(array $input, string $field): string
    {
        $value = $this->text($input, $field);
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) throw new RuleViolation('Fecha inválida en ' . $field . '.');
        return $value;
    }
    public function withdraw(array $actor, array $input): array
    {
        $this->expire();
        return Transaction::run($this->pdo, function() use($actor, $input) {
            $proposal = $this->proposals->get($this->id($input['pid'] ?? null), true);
            $this->leader($actor, $proposal);
            if ($proposal['confirmed']) throw new RuleViolation('El proyecto ya fue confirmado.', 409);
            $this->version($proposal, $input);
            $link = null;
            $active = [];
            foreach ($proposal['relations'] as $r) {
                if ($r['rubric'] === ($input['rid'] ?? null)) $link = $r;
                if (!$r['withdrawn']) $active[] = $r;
            }
            if (!$link || $link['withdrawn'] || !in_array($link['decision'], ['RECHAZADA', 'CADUCADA'], true)) throw new RuleViolation('Solo se retiran vínculos rechazados o caducados.', 409);
            if (count($active) <= 2) throw new RuleViolation('Deben quedar al menos dos vínculos activos.', 409);
            $ids = array_column(array_filter($active, fn($r) => $r['id'] !== $link['id']), 'rubric');
            $rubrics = $this->selected($ids, false, $ids);
            [$members, $removed] = $this->team($proposal['leader'], $proposal['members'], $rubrics, $proposal['members'], true);
            $this->coverage($members, $rubrics);
            $this->proposals->bump($proposal);
            $this->proposals->members($proposal['teamId'], $members);
            $this->proposals->withdraw($link['id']);
            $this->proposals->history($actor, $proposal, 'propuesta_rubrica', $link['id'], 'Vínculo retirado', ['before' => $link, 'removed' => $removed, 'note' => implode(', ', $removed)]);
            $this->proposals->recalculate($proposal['id']);
            return $removed;
        });
    }
    public function expire(): void
    {
        if ($this->today() < $this->academic->period()['caducidad']) return;
        Transaction::run($this->pdo, function() {
            $system = ['id' => 'sistema'];
            foreach ($this->proposals->expiredIds() as $id) {
                $proposal = $this->proposals->get($id, true);
                if ($proposal['confirmed']) continue;
                $this->proposals->bump($proposal);
                foreach ($proposal['relations'] as $link) {
                    if ($link['withdrawn'] || !in_array($link['decision'], ['PENDIENTE', 'OBSERVADA'], true)) continue;
                    $before = $link;
                    $link['expiryReason'] = $link['decision'] === 'PENDIENTE' ? 'Falta de respuesta del profesor' : 'Falta de corrección del equipo';
                    $link['decision'] = 'CADUCADA';
                    $this->proposals->updateLink($link);
                    $this->proposals->history($system, $proposal, 'propuesta_rubrica', $link['id'], 'CADUCADA', ['before' => $before, 'note' => $link['expiryReason']]);
                    $teacher = $this->rubrics->get($link['rubric'])['teacher'];
                    $this->proposals->notice($proposal, $link, 'expiry', 'Revisión caducada', array_merge($proposal['members'], [$teacher]));
                }
                $this->proposals->recalculate($id);
            }
        });
    }
}
