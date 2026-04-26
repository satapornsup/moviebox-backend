# MovieBox — Quickstart Checklist

ทำตามลำดับนี้ ก่อนเริ่ม Day 1 ของ workshop จริง รวมเวลาประมาณ 30-40 นาที

## 1. สมัคร TMDb API key (5 นาที)

1. สมัครบัญชี https://www.themoviedb.org/signup
2. ไปที่ Settings → API → "Request an API Key" เลือก "Developer"
3. กรอกข้อมูลแบบฟอร์ม (URL ใส่ `http://localhost`, use case ใส่ "Personal portfolio project" ก็ผ่าน)
4. Copy **API Key (v3 auth)** เก็บไว้ จะใช้ในไฟล์ `.env`

## 2. สร้าง MongoDB Atlas free cluster (10 นาที)

1. สมัคร https://www.mongodb.com/cloud/atlas/register
2. **Create Cluster** → เลือก M0 Free → AWS / region ที่ใกล้ไทย (Singapore: `ap-southeast-1`)
3. **Database Access** → Add User → ใส่ username/password (จดไว้)
4. **Network Access** → Add IP → ใส่ `0.0.0.0/0` (เปิด public ตอน dev — ปลอดภัยพอเพราะ user/password ป้องกันอยู่)
5. **Connect → Drivers → Node.js** → copy connection string รูปแบบนี้:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/moviebox?retryWrites=true&w=majority
   ```
   (แทน `<user>` และ `<password>` ด้วยที่จด อย่าลืมเติม `/moviebox` ก่อน `?` เพื่อบอกชื่อ database)

> Atlas free tier มี replica set มาให้ — Prisma ต้องการอันนี้สำหรับ transactions

## 3. สร้าง 2 GitHub repos (5 นาที)

ไปที่ https://github.com/new สร้างทีละอัน:

- **moviebox-backend** (private หรือ public ก็ได้ — public ดีกว่าสำหรับ portfolio)
- **moviebox-android** (เดียวกัน)

อย่าใส่ README/gitignore/license ตอนสร้าง — จะ scaffold ใส่เอง

## 4. ลง code backend ที่ผม scaffold ให้

จาก folder `moviebox-backend` ใน outputs ของคุณ:

```bash
cd path/to/your/local/projects
# คัดลอก folder moviebox-backend จาก outputs มาที่นี่

cd moviebox-backend

# Init git
git init -b main
git remote add origin git@github.com:<you>/moviebox-backend.git

# Setup env
cp .env.example .env
# แก้ DATABASE_URL = connection string ของ Atlas
# แก้ TMDB_KEY = API key ที่คัดมา

# Install
npm install            # postinstall จะ run prisma generate ให้

# Push schema → Atlas (สร้าง index)
npm run prisma:push

# รัน test ดูว่าผ่านหมด
npm test

# รัน dev server
npm run dev
# ลองเปิด http://localhost:3000/health → ควรได้ {"ok":true}
# ลอง http://localhost:3000/api/movies/popular → ควรได้รายการหนัง
```

ถ้าผ่าน → push code:

```bash
git add .
git commit -m "chore: initial backend scaffold (Prisma + TS + Express)"
git push -u origin main
```

ดู GitHub Actions tab → CI ควร run และเขียว

## 5. ตั้ง branch protection (3 นาที)

ใน GitHub repo → Settings → Branches → Add branch protection rule:
- Branch name pattern: `main`
- ✅ Require pull request before merging
- ✅ Require status checks to pass (เลือก `test` ที่ออกมาจาก CI)
- ✅ Require branches to be up to date

หลังจากนี้ feature ใหม่ทำใน branch แยก แล้ว PR เข้า main เท่านั้น

## 6. Smoke test API ผ่าน curl (2 นาที)

```bash
# Health
curl http://localhost:3000/health

# TMDb proxy
curl 'http://localhost:3000/api/movies/popular?page=1' | head -c 200

# Add favorite
curl -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo-user" \
  -d '{"movieId": 550, "title": "Fight Club", "posterPath": "/abc.jpg"}'

# List
curl -H "x-user-id: demo-user" http://localhost:3000/api/favorites

# Delete
curl -X DELETE -H "x-user-id: demo-user" http://localhost:3000/api/favorites/550
```

ถ้า 5 calls ข้างบนผ่าน → backend พร้อมใช้งาน ไป Android ต่อได้

---

## Troubleshooting

| ปัญหา | เหตุ + วิธีแก้ |
|---|---|
| `Error: P1001 Can't reach database server` | DATABASE_URL ผิด หรือ IP whitelist ยังไม่อนุญาต — กลับไปเช็ค Atlas Network Access |
| `Error: P2031 transactions require a replica set` | ใช้ MongoDB community ลงเครื่อง (standalone) — Atlas free แก้ปัญหานี้ ให้สลับมา Atlas |
| `prisma generate` ค้าง | ลบ `node_modules` + `package-lock.json` แล้ว `npm install` ใหม่ |
| TMDb response 401 | API key ผิด หรือใช้ v4 token แทน v3 — ต้อง v3 |
| Test fail "cannot find module @prisma/client" | ลืมรัน `npx prisma generate` (postinstall hook อาจ fail บางเครื่อง) |
