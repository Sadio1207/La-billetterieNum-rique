$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$templatePath = Join-Path $projectRoot '.env.example'

if (Test-Path -LiteralPath $envPath) {
    throw '.env existe deja. Gardez-le et modifiez-le manuellement; le script ne l ecrasera pas.'
}
if (-not (Test-Path -LiteralPath $templatePath)) {
    throw '.env.example est introuvable.'
}

$email = (Read-Host 'Adresse e-mail du premier administrateur').Trim().ToLowerInvariant()
if ($email.Length -gt 254 -or $email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
    throw 'Adresse e-mail invalide.'
}

function ConvertFrom-SecureInput([Security.SecureString]$Value) {
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    }
}

$securePassword = Read-Host 'Mot de passe admin (16 caracteres minimum)' -AsSecureString
$secureConfirmation = Read-Host 'Confirmez le mot de passe admin' -AsSecureString
$adminPassword = ConvertFrom-SecureInput $securePassword
$confirmation = ConvertFrom-SecureInput $secureConfirmation
if ($adminPassword.Length -lt 16 -or $adminPassword -notmatch '^[A-Za-z0-9!@._%+-]+$') {
    throw 'Utilisez au moins 16 caracteres parmi les lettres, chiffres et ! @ . _ % + -.'
}
if ($adminPassword -cne $confirmation) {
    throw 'Les deux mots de passe ne correspondent pas.'
}

function New-HexSecret([int]$ByteCount) {
    $bytes = [byte[]]::new($ByteCount)
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

$databasePassword = New-HexSecret 32
$databaseAppPassword = New-HexSecret 32
$sessionSecret = New-HexSecret 48
$values = @{
    'DATABASE_URL' = "postgres://terangapass:$databaseAppPassword@localhost:5432/terangapass"
    'POSTGRES_PASSWORD' = $databasePassword
    'POSTGRES_APP_PASSWORD' = $databaseAppPassword
    'SESSION_SECRET' = $sessionSecret
    'INITIAL_ADMIN_EMAIL' = $email
    'INITIAL_ADMIN_PASSWORD' = $adminPassword
}

$lines = foreach ($line in Get-Content -LiteralPath $templatePath) {
    if ($line -match '^([A-Z_]+)=') {
        $key = $Matches[1]
        if ($values.ContainsKey($key)) { "$key=$($values[$key])" } else { $line }
    } else {
        $line
    }
}
$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllLines($envPath, [string[]]$lines, $encoding)
$adminPassword = $null
$confirmation = $null
$values = $null

Write-Host '.env cree avec des secrets generes localement; aucun secret n a ete affiche.'
Write-Host 'Renseignez les vrais comptes Wave/Orange Money, le nom du beneficiaire et l e-mail de support dans .env avant d accepter des reservations.'
Write-Host 'Demarrez Docker Desktop, puis lancez: docker compose up --build -d'
