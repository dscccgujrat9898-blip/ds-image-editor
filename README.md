# Classroom Connect Desktop (Electron)

Ye project ek **desktop-first messenger prototype** hai jo WhatsApp-style workflow follow karta hai:

- ID create / switch
- Sab users list me dikhte hain
- Connection request send/accept
- Accepted connection ke baad chat + file transfer
- Audio / Video / Screen-share (local device stream preview)
- Local storage based data persistence
- Backup / restore JSON
- Auto backup every 30 seconds into `Documents/ClassroomConnectBackups`

## Important scope note
RustDesk jaisa full remote-control (keyboard/mouse + remote Windows control over network) production-grade feature yahan included nahi hai. Uske liye dedicated secure relay, NAT traversal infra, encryption/session architecture aur permission model chahiye hota hai.

## Run

```bash
npm install
npm run start
```

## Browser me run (quick test)

`app/index.html` ko kisi static server se open karein (jaise VS Code Live Server).  
Browser mode me app चलेगा, lekin desktop file-system backup ki jagah:
- auto backup `localStorage` me save hoga
- manual backup JSON download hoga

## Windows EXE build

```bash
npm run build:win
```

Build output: `dist/` folder.
