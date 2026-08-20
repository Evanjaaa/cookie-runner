# tools/render-icons.ps1
# -------------------------------------------------------------
# ย่อ tools/logo_meowsing.jpg เป็นไอคอนทุกขนาดที่เกมต้องใช้
#
# ต้นฉบับเก็บไว้นอก public/ ตั้งใจ — ไฟล์ต้นฉบับ 150KB ไม่มีใครโหลด
# ถ้าวางไว้ใน public/ มันจะติดไปกับ dist/ ทุกครั้งโดยไม่มีใครเรียกใช้
# อยากเปลี่ยนโลโก้: เอาไฟล์ใหม่ทับ tools/logo_meowsing.jpg แล้วรัน npm run icons
#
# ใช้ WPF ที่ติดมากับ Windows อยู่แล้ว ไม่ต้องลง ImageMagick หรือ npm package
#
#   powershell -File tools/render-icons.ps1
# -------------------------------------------------------------
Add-Type -AssemblyName PresentationCore, WindowsBase

$root = Split-Path $PSScriptRoot -Parent
$srcPath = Join-Path $root 'tools\logo_meowsing.jpg'
if (-not (Test-Path $srcPath)) { throw "ไม่พบไฟล์ต้นฉบับ: $srcPath" }

$src = New-Object System.Windows.Media.Imaging.BitmapImage
$src.BeginInit()
$src.UriSource = New-Object System.Uri($srcPath)
$src.CacheOption = 'OnLoad'          # อ่านเข้าหน่วยความจำเลย ไฟล์จะได้ไม่ถูกล็อกไว้
$src.EndInit()
$src.Freeze()
Write-Output ("ต้นฉบับ {0}x{1}" -f $src.PixelWidth, $src.PixelHeight)

# พื้นหลังของไอคอนแบบ maskable ดูดสีจากภาพต้นฉบับเอง จะได้ไม่ต้องไล่แก้ตามทุกครั้งที่เปลี่ยนโลโก้
# ดูดสองจุดแล้วทำเป็นไล่สีรัศมี เพราะต้นฉบับมีแสงฟุ้งกลางภาพ ถ้าเติมสีเรียบ
# รอยต่อระหว่างขอบภาพที่ย่อกับพื้นที่เติมจะเห็นเป็นกรอบสี่เหลี่ยมชัดเจน
$bgra = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap(
  $src, [System.Windows.Media.PixelFormats]::Bgra32, $null, 0)
function Get-Pixel([int]$x, [int]$y) {
  $b = New-Object byte[] 4
  $bgra.CopyPixels((New-Object System.Windows.Int32Rect($x, $y, 1, 1)), $b, 4, 0)
  return [System.Windows.Media.Color]::FromRgb($b[2], $b[1], $b[0])
}
$edge = Get-Pixel ([int]($src.PixelWidth / 2)) 6      # กลางขอบบน สว่างกว่า
$corner = Get-Pixel 6 6                              # มุม เข้มที่สุด

$bgBrush = New-Object System.Windows.Media.RadialGradientBrush
$bgBrush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($edge, 0.0)))
$bgBrush.GradientStops.Add((New-Object System.Windows.Media.GradientStop($corner, 1.0)))
$bgBrush.RadiusX = 0.75
$bgBrush.RadiusY = 0.75
$bgBrush.Freeze()
Write-Output ("สีพื้น #{0:X2}{1:X2}{2:X2} ถึง #{3:X2}{4:X2}{5:X2}" -f
  $edge.R, $edge.G, $edge.B, $corner.R, $corner.G, $corner.B)

# corner = สัดส่วนรัศมีมุมต่อด้าน (0 = เต็มสี่เหลี่ยม)
#   iOS ตัดมุมไอคอนหน้าโฮมให้เองอยู่แล้ว ส่งรูปตัดมุมมาก่อนจะกลายเป็นตัดสองชั้น
# inset = ย่อภาพเข้ามาเท่าไหร่ แล้วเติมพื้นรอบ ๆ ด้วยสีที่ดูดมา
#   Android ครอบทรงไอคอน maskable เองแล้วตัดขอบทิ้งได้ถึง 20% ปลายหนวดจึงต้องหลบเข้ามา
$targets = @(
  @{ file = 'icon-512.png';            size = 512; corner = 0.219; inset = 1    },
  @{ file = 'icon-192.png';            size = 192; corner = 0.219; inset = 1    },
  @{ file = 'icon-maskable-512.png';   size = 512; corner = 0;     inset = 0.78 },
  @{ file = 'apple-touch-icon.png';    size = 180; corner = 0;     inset = 1    },
  @{ file = 'favicon-32.png';          size = 32;  corner = 0.219; inset = 1    },
  @{ file = 'favicon-16.png';          size = 16;  corner = 0.219; inset = 1    }
)

foreach ($t in $targets) {
  $size = [double]$t.size
  $inset = [double]$t.inset
  $r = $size * [double]$t.corner

  $visual = New-Object System.Windows.Media.DrawingVisual
  # ค่าเริ่มต้นของ WPF ทำภาพย่อขนาดเล็กแตกเป็นเม็ด ต้องสั่งใช้ตัวย่อคุณภาพสูงเอง
  [System.Windows.Media.RenderOptions]::SetBitmapScalingMode(
    $visual, [System.Windows.Media.BitmapScalingMode]::HighQuality)
  $dc = $visual.RenderOpen()

  $full = New-Object System.Windows.Rect(0, 0, $size, $size)
  if ($r -gt 0) {
    $dc.PushClip((New-Object System.Windows.Media.RectangleGeometry($full, $r, $r)))
  }

  # ทาพื้นก่อนเสมอ กันขอบโปร่งหลุดออกมาถ้าภาพต้นฉบับมีช่องอัลฟา
  $dc.DrawRectangle($bgBrush, $null, $full)


  # ต้องคิดไว้ก่อนเป็นตัวแปร — ใส่นิพจน์คูณลงในวงเล็บอาร์กิวเมนต์ตรง ๆ
  # PowerShell จะอ่านเป็น ($pad, $pad, $size) * $inset แล้วพังทันที
  $pad = $size * (1 - $inset) / 2
  $side = $size * $inset
  $dc.DrawImage($src, (New-Object System.Windows.Rect($pad, $pad, $side, $side)))

  if ($r -gt 0) { $dc.Pop() }
  $dc.Close()

  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(
    $t.size, $t.size, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($visual)

  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
  $out = Join-Path $root ('public\' + $t.file)
  $fs = [System.IO.File]::Create($out)
  $enc.Save($fs)
  $fs.Close()
  Write-Output ("  {0,-24} {1}x{1}" -f $t.file, $t.size)
}

Write-Output 'เขียน PNG ครบแล้ว'
