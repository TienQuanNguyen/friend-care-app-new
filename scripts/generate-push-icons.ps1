Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($size in @(180, 192, 512)) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#155F7A'))
  $graphics.ScaleTransform($size / 100.0, $size / 100.0)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier(50, 72, 16, 52, 25, 27, 40, 31)
  $path.AddBezier(40, 31, 46, 32, 49, 36, 50, 39)
  $path.AddBezier(50, 39, 57, 24, 75, 29, 75, 43)
  $path.AddBezier(75, 43, 75, 55, 59, 67, 50, 72)
  $path.CloseFigure()
  $graphics.FillPath([System.Drawing.Brushes]::White, $path)
  $bitmap.Save((Join-Path $iconDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $path.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
Write-Output 'Generated Friend Care PNG icons (180, 192, 512).'
