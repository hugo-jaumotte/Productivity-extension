# build.ps1 - Compile TS et copie HTML/CSS

Write-Host "Compiling TypeScript..."
npx tsc

# Fonction pour copier les fichiers (HTML/CSS)
function Copy-Files($extension) {
    Write-Host "Copying *.$extension files..."
    Get-ChildItem -Path src -Recurse -Include *.$extension | ForEach-Object {
        $dest = $_.FullName.Replace("src", "dist")
        $destDir = Split-Path $dest
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir | Out-Null
        }
        Copy-Item $_.FullName -Destination $dest -Force
    }
}

Copy-Files "html"
Copy-Files "css"

Write-Host "Build complete!"
