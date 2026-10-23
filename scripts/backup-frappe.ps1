$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$BackupDir = Join-Path $ProjectDir "backups"
$LogDir = Join-Path $ProjectDir "logs"
$Container = "ccomunes-dev-frappe-1"
$Site = "ccomunes.localhost"
$RetentionDays = 14

New-Item -ItemType Directory -Force $BackupDir, $LogDir | Out-Null
$LogFile = Join-Path $LogDir "backup-frappe.log"

function Write-Log([string]$Message) {
    $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    Add-Content -LiteralPath $LogFile -Value $Line
    Write-Host $Line
}

try {
    Write-Log "Iniciando respaldo de $Site."

    $Running = docker inspect --format '{{.State.Running}}' $Container
    if ($LASTEXITCODE -ne 0 -or $Running -ne "true") {
        throw "El contenedor $Container no está en ejecución."
    }

    docker exec $Container bash -lc "cd /home/frappe/frappe-bench && bench --site $Site backup --with-files"
    if ($LASTEXITCODE -ne 0) {
        throw "Frappe no pudo generar el respaldo."
    }

    $LatestContainerDb = docker exec $Container bash -lc "ls -1t /home/frappe/frappe-bench/sites/$Site/private/backups/*-database.sql.gz 2>/dev/null | head -n 1"
    if ($LASTEXITCODE -ne 0 -or -not $LatestContainerDb) {
        throw "No se encontró un respaldo de base de datos dentro del contenedor."
    }

    docker cp "${Container}:/home/frappe/frappe-bench/sites/$Site/private/backups/." $BackupDir
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron copiar los respaldos al equipo Windows."
    }

    $LatestDb = Get-Item (Join-Path $BackupDir (Split-Path $LatestContainerDb -Leaf)) -ErrorAction SilentlyContinue
    if (-not $LatestDb -or $LatestDb.Length -eq 0) {
        throw "No se encontró la copia SQL recién generada o está vacía."
    }

    $DbStream = [System.IO.File]::OpenRead($LatestDb.FullName)
    try {
        $Gzip = [System.IO.Compression.GZipStream]::new($DbStream, [System.IO.Compression.CompressionMode]::Decompress)
        try {
            $Buffer = New-Object byte[] 1
            if ($Gzip.Read($Buffer, 0, 1) -le 0) {
                throw "El respaldo SQL comprimido está vacío o es inválido."
            }
        }
        finally {
            $Gzip.Dispose()
        }
    }
    finally {
        $DbStream.Dispose()
    }

    $RequiredPatterns = @(
        "*-site_config_backup.json",
        "*-database.sql.gz",
        "*-files.tar",
        "*-private-files.tar"
    )

    foreach ($Pattern in $RequiredPatterns) {
        $File = Get-Item (Join-Path $BackupDir ($LatestDb.Name -replace '-database\.sql\.gz$', ($Pattern -replace '^\*-', ''))) -ErrorAction SilentlyContinue
        if (-not $File) {
            $Prefix = $LatestDb.Name -replace '-database\.sql\.gz$', ''
            $File = Get-Item (Join-Path $BackupDir "$Prefix-$($Pattern.Substring(2))") -ErrorAction SilentlyContinue
        }
        if (-not $File -or $File.Length -eq 0) {
            throw "Falta un componente del respaldo: $Pattern"
        }
    }

    $Cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem $BackupDir -File |
        Where-Object { $_.LastWriteTime -lt $Cutoff } |
        Remove-Item -Force

    Write-Log "Respaldo completado. Base verificada: $($LatestDb.Name)"
    Write-Log "Retención aplicada: $RetentionDays días."
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
