# realtime-file-sharing

Backend chia sẻ tệp và chat thời gian thực, được xây dựng bằng NestJS trong một Nx monorepo. Hệ thống gồm các API HTTP, WebSocket cho chat, gRPC nội bộ giữa `auth` và `users`, cùng MongoDB/GridFS để lưu dữ liệu và tệp.

## 1. Khởi động nhanh

### Bước 1: Clone và cài dependencies

```bash
npm install
```

### Bước 2: Tạo biến môi trường

Tạo file `.env` ở thư mục gốc:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/realtime_file_sharing
JWT_SECRET=replace-with-a-long-random-secret
USERS_GRPC_URL=127.0.0.1:5000
```

### Bước 3: Khởi động MongoDB

```bash
docker compose -f .development/docker-compose.yml up -d
```

### Bước 4: Chạy các service

Chạy tất cả service trong các process do Nx quản lý:

```bash
npm start
```

Hoặc chạy riêng từng service:

```bash
npx nx serve auth
npx nx serve users
npx nx serve files
npx nx serve chat
```

## 3. Kiến trúc

```mermaid
flowchart LR
    Client[Client / Web App]
    Auth[Auth API\nHTTP :3000]
    Users[Users API + gRPC\nHTTP :3001 / gRPC :5000]
    Chat[Chat API + WebSocket\nHTTP :3003]
    Files[Files API\nHTTP :3002]
    Mongo[(MongoDB\nDatabase + GridFS :27017)]

    Client --> Auth
    Client --> Users
    Client --> Chat
    Client --> Files
    Auth -->|gRPC| Users
    Auth --> Mongo
    Users --> Mongo
    Chat --> Mongo
    Files --> Mongo
```

### Luồng đăng ký và đăng nhập

```mermaid
sequenceDiagram
    participant Client
    participant Auth as Auth API
    participant Users as Users gRPC
    participant DB as MongoDB

    Client->>Auth: POST /api/auth/register
    Auth->>Users: CreateUser
    Users->>DB: Lưu user với password hash
    DB-->>Users: User
    Users-->>Auth: User
    Auth-->>Client: User
    Client->>Auth: POST /api/auth/login
    Auth->>DB: Kiểm tra email và password
    Auth-->>Client: accessToken + refreshToken
```

### Luồng chat và chia sẻ tệp

```mermaid
sequenceDiagram
    participant ClientA as Client A
    participant Chat as Chat API / WebSocket
    participant Files as Files API
    participant DB as MongoDB / GridFS
    participant ClientB as Client B

    ClientB->>Chat: Kết nối WebSocket và joinRoom
    ClientA->>Files: POST /api/files (multipart file)
    Files->>DB: Lưu binary vào GridFS
    Files->>DB: Lưu metadata file
    DB-->>Files: fileId
    Files-->>ClientA: Thông tin file
    ClientA->>Chat: POST /api/chat-rooms/:roomId/messages
    Chat->>DB: Lưu message
    Chat-->>ClientB: newMessage qua WebSocket
```

## 4. Cấu trúc thư mục

```text
apps/
  auth/      # Đăng ký, đăng nhập, JWT và client gRPC tới users
  users/     # Quản lý user qua HTTP và gRPC
  chat/      # Phòng chat, message và Socket.IO gateway
  files/     # Upload, download và share link qua GridFS
libs/
  common/    # MongoDB, JWT strategy, guard và decorator dùng chung
  models/    # Mongoose schema và DTO dùng chung
  smc/gridfs # Cấu hình Multer GridFS
.development/
  docker-compose.yml # MongoDB cho môi trường development
```
