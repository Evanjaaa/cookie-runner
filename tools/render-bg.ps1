# tools/render-bg.ps1
# -------------------------------------------------------------
# ย่อภาพต้นฉบับเป็นฉากหลังหน้าแรก public/home-bg.jpg
#
# ขนาดต้องเท่ากับ "ความละเอียดจริง" ของ canvas ไม่ใช่ค่าใน index.html
#
# index.html เขียน width="960" height="420" ไว้ก็จริง แต่ fitDPR() ใน main.js
# เขียนทับตอนรันเป็น 960*DPR x 420*DPR (เพดาน DPR = 2) บนจอความละเอียดสูง
# บัฟเฟอร์จริงจึงเป็น 1920x840 ไม่ใช่ 960x420
#
# ถ้าส่งภาพมาแค่ 960x420 มันจะถูกขยายสองเท่าตอนวาด = เห็นเป็นภาพแตก
# ซึ่งเห็นชัดเฉพาะกับภาพวาดแบบนี้ ของอื่นในเกมวาดเป็นเวกเตอร์จึงคมตามความละเอียดจริงอยู่แล้ว
#
# ใหญ่กว่า 1920x840 ก็ไม่ได้ประโยชน์ เพราะ fitDPR() ตัดเพดานที่ 2 เท่าอยู่ดี
# แถมเบราว์เซอร์ต้องย่อให้ใหม่ทุกเฟรม ตอนนี้พอดีเป๊ะ drawImage จึงเป็นการก๊อปพิกเซลตรง ๆ
#
# ต้นฉบับอยู่นอก public/ ตั้งใจ ไม่งั้นมันจะติดไปกับ dist/ ทั้งก้อนโดยไม่มีใครเรียก
# เปลี่ยนฉากหลัง: วางไฟล์ใหม่ใน tools/ แล้วแก้ตาราง $SCENES ข้างล่าง จากนั้นรัน npm run assets
#
#   powershell -File tools/render-bg.ps1
# -------------------------------------------------------------
Add-Type -AssemblyName PresentationCore, WindowsBase

$root = Split-Path $PSScriptRoot -Parent
$SRC_NAME = 'BG_meowsing5.jpg'
$srcPath = Join-Path $root ('tools\' + $SRC_NAME)
if (-not (Test-Path $srcPath)) { throw "ไม่พบไฟล์ต้นฉบับ: $srcPath" }

# 2816 = ความกว้างของไฟล์ต้นฉบับพอดี ใหญ่กว่านี้คือยืดภาพเปล่า ๆ ไม่ได้รายละเอียดเพิ่ม
$OUT_W = 2816
$OUT_H = 1232
# ตำแหน่งกรอบที่ตัด: 0 = ชิดบน / 0.5 = กลาง / 1 = ชิดล่าง
#
# ค่านี้ไม่ได้เลือกตามความสวยของภาพ แต่เลือกให้ "พื้นที่น้องแมวยืน" มาอยู่ที่ y=320
# ของ canvas พอดี เพราะน้องยืนเท้าติดเส้นนั้นตายตัว (GROUND_Y ใน config.js)
# เลื่อนขึ้นแล้วแมวจะลอย เลื่อนลงแล้วจะจมหายเข้าไปในพื้น
#
# วิธีวัด: scratchpad/tryfocus.ps1 เรนเดอร์หลายค่าแล้ววาดกรอบขนาดตัวแมวทับให้ดู
#
# ฉากหลังทุกอันในเกมอยู่ในตารางนี้ ทุกอันมีน้องแมวยืนอยู่ตรงกลางเหมือนกัน
# จึงต้องจูน focus แยกกันให้พื้นของแต่ละภาพมาอยู่ที่เส้นเท้าเดียวกัน
$SCENES = @(
  @{ src = 'BG_meowsing5.jpg';    out = 'home-bg.jpg'; focus = 0.58 },   # หน้าแรก — เท้าลงกลางพรมหน้าปราสาท
  @{ src = 'BG_meowsingroom.jpg'; out = 'room-bg.jpg'; focus = 1.00 }    # ฉากห้องก่อนเริ่มวิ่ง — เท้าลงบนพรมหัวใจ
)

foreach ($scene in $SCENES) {
  $srcPath = Join-Path $root ("tools\\" + $scene.src)
  if (-not (Test-Path $srcPath)) { throw "ไม่พบไฟล์ต้นฉบับ: $srcPath" }

  $src = New-Object System.Windows.Media.Imaging.BitmapImage
  $src.BeginInit()
  $src.UriSource = New-Object System.Uri($srcPath)
  $src.CacheOption = "OnLoad"
  $src.EndInit()
  $src.Freeze()

  $sw = [double]$src.PixelWidth
  $sh = [double]$src.PixelHeight
  $target = $OUT_W / $OUT_H

  # ครอบเต็มกรอบ (cover) — ตัดด้านที่ยาวเกิน ไม่ใช่บีบภาพให้เพี้ยน
  if ($sw / $sh -gt $target) {
    $cropH = $sh
    $cropW = $sh * $target
  } else {
    $cropW = $sw
    $cropH = $sw / $target
  }
  $cropX = ($sw - $cropW) / 2
  $cropY = ($sh - $cropH) * [double]$scene.focus

  $crop = New-Object System.Windows.Media.Imaging.CroppedBitmap(
    $src, (New-Object System.Windows.Int32Rect([int]$cropX, [int]$cropY, [int]$cropW, [int]$cropH)))

  $visual = New-Object System.Windows.Media.DrawingVisual
  [System.Windows.Media.RenderOptions]::SetBitmapScalingMode(
    $visual, [System.Windows.Media.BitmapScalingMode]::HighQuality)
  $dc = $visual.RenderOpen()
  $dc.DrawImage($crop, (New-Object System.Windows.Rect(0, 0, $OUT_W, $OUT_H)))
  $dc.Close()

  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(
    $OUT_W, $OUT_H, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($visual)

  # JPEG ไม่ใช่ PNG — ภาพวาดไล่สีแบบนี้ PNG จะใหญ่กว่าหลายเท่าโดยตาดูไม่ออกว่าต่างกัน
  $enc = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
  $enc.QualityLevel = 80
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
  $out = Join-Path $root ("public\\" + $scene.out)
  $fs = [System.IO.File]::Create($out)
  $enc.Save($fs)
  $fs.Close()

  $kb = [math]::Round((Get-Item $out).Length / 1KB)
  Write-Output ("  {0} -> {1}  {2}x{3} focus {4}  {5} KB" -f
    $scene.src, $scene.out, $OUT_W, $OUT_H, $scene.focus, $kb)
}
