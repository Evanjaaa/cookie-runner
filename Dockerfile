# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# มีสองเป้าหมายในไฟล์เดียว เลือกด้วย --target
#
#   dev   เซิร์ฟเวอร์ตอนพัฒนา แก้โค้ดแล้วเห็นผลทันที (docker compose up)
#   prod  เว็บที่ build เสร็จแล้ว เสิร์ฟด้วย nginx ไฟล์เล็กและเร็ว
#
# ใช้ node 22 ให้ตรงกับ .github/workflows/deploy.yml เป๊ะ ๆ
# ถ้าเวอร์ชันไม่ตรงกับที่ CI ใช้ ของที่ build ออกมาอาจไม่เหมือนกัน
# ─────────────────────────────────────────────────────────────

# ── ฐานร่วม: ลง dependency ครั้งเดียวแล้วใช้ต่อทั้งสองเป้าหมาย ──
FROM node:22-alpine AS deps
WORKDIR /app

# ก๊อปแค่ไฟล์รายการ dependency ก่อน ไม่ใช่ทั้งโปรเจกต์
# แก้โค้ดเกมแล้ว Docker จะใช้ชั้นนี้ซ้ำได้เลย ไม่ต้อง npm ci ใหม่ทุกครั้ง
COPY package.json package-lock.json ./

# ci ไม่ใช่ install — อ่านจาก package-lock.json ตรง ๆ
# ทุกเครื่องจึงได้เวอร์ชันเดียวกันเป๊ะ ซึ่งคือเหตุผลทั้งหมดที่ใส่ Docker
RUN npm ci

# ── โหมดพัฒนา ────────────────────────────────────────────────
FROM deps AS dev
WORKDIR /app

# โค้ดจริงมาจาก bind mount ใน compose ไม่ได้ COPY เข้ามา
# แก้ไฟล์บนเครื่องแล้วในคอนเทนเนอร์เห็นทันที ไม่ต้อง build ใหม่
ENV NODE_ENV=development

# บน Windows/macOS ไฟล์ที่ mount เข้ามาไม่ส่งสัญญาณ inotify ให้คอนเทนเนอร์รู้
# ต้องให้ Vite คอยไล่เช็คเองเป็นรอบ ๆ ไม่งั้นแก้โค้ดแล้วหน้าเว็บไม่รีเฟรช
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 5173
# --host 0.0.0.0 บังคับไว้ตรงนี้ด้วย ถึงจะตั้งใน vite.config.js แล้วก็ตาม
# ถ้าผูกกับ localhost เฉย ๆ มันจะหมายถึง localhost "ในคอนเทนเนอร์"
# ซึ่งเครื่องเราเข้าไม่ถึง แล้วจะเห็นเป็นเปิดเว็บไม่ติดทั้งที่เซิร์ฟเวอร์รันอยู่
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── โหมดขึ้นจริง ─────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
# คีย์ Supabase ถูกฝังลงไฟล์ตอน build (Vite แทน import.meta.env ตอนนี้)
# จึงต้องส่งเข้ามาตอน build ไม่ใช่ตอนรัน — ส่งผ่าน build args
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:alpine AS prod
# ผลลัพธ์เป็นไฟล์นิ่ง ๆ ล้วน ไม่ต้องมี node ในภาพสุดท้ายเลย
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
