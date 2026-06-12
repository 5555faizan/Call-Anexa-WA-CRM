New-Item -ItemType Directory -Path "backend" -Force
cd backend
npm init -y
npm install express cors whatsapp-web.js qrcode-terminal dotenv socket.io
cd ..
npx -y create-vite@latest frontend --template react
cd frontend
npm install
npm install axios react-router-dom lucide-react socket.io-client
