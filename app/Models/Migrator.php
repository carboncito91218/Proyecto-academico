<?php
declare(strict_types=1);
namespace App\Models;
use PDO;
use RuntimeException;
final class Migrator
{
    public function __construct(private PDO $pdo, private string $directory) {}
    public function run(): void
    {
        $this->pdo->beginTransaction();
        try {
            $this->pdo->exec('SELECT pg_advisory_xact_lock(784261)');
            $tables = $this->pdo->query("SELECT tablename FROM pg_tables WHERE schemaname='public'")->fetchAll(PDO::FETCH_COLUMN);
            if ($tables && !in_array('schema_migrations', $tables, true)) {
                throw new RuntimeException('Esquema existente sin registro de migraciones. Requiere adaptación incremental antes de continuar.');
            }
            $this->pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
            $applied = $this->pdo->query('SELECT name, checksum FROM schema_migrations')->fetchAll(PDO::FETCH_KEY_PAIR);
            $files = glob($this->directory . '/*.sql');
            sort($files);
            foreach ($files as $file) {
                $name = basename($file);
                $checksum = hash_file('sha256', $file);
                if (isset($applied[$name])) {
                    if ($applied[$name] !== $checksum) throw new RuntimeException('Migración aplicada modificada: ' . $name);
                    echo "Omitida $name\n";
                    continue;
                }
                $this->pdo->exec(file_get_contents($file));
                $query = $this->pdo->prepare('INSERT INTO schema_migrations(name,checksum) VALUES (?,?)');
                $query->execute([$name,$checksum]);
                echo "Aplicada $name\n";
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }
}
