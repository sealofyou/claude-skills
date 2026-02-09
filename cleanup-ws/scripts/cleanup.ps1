# Claude Code Temp Files Cleanup Script (PowerShell)
# Usage: .\cleanup.ps1 [directory_path]
#        Defaults to E:\workspace if not specified

param(
    [string]$TargetDir = "E:\workspace"
)

function Remove-ClaudeTempFiles {
    param([string]$Path)

    $count = 0

    try {
        $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue

        foreach ($item in $items) {
            if ($item.Name -match 'tmpclaude.*-cwd') {
                try {
                    $item.Delete()
                    $count++
                    Write-Host "  [DELETE] $($item.FullName)"
                } catch {
                    Write-Host "  [ERROR] $($item.FullName): $($_.Exception.Message)" -ForegroundColor Yellow
                }
            } elseif ($item.PSIsContainer) {
                $subCount = Remove-ClaudeTempFiles -Path $item.FullName
                $count += $subCount
            }
        }
    } catch {
        # Ignore directories we can't access
    }

    return $count
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Claude Code Temp Files Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target: $TargetDir"
Write-Host ""

$totalDeleted = Remove-ClaudeTempFiles -Path $TargetDir

Write-Host ""
Write-Host "Deleted $totalDeleted temp file(s)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
