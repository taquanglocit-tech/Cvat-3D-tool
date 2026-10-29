# CVAT 3D Super Pro (Chrome Extension)
**Tác giả & Ý tưởng:** `taquanglocit-tech`  
**Mục đích:** Công cụ hỗ trợ gắn nhãn 3D LiDAR & Bounding Box cho xe tự lái trên nền tảng CVAT chuẩn công nghiệp (Professional CAD/LiDAR UX).

---

## 🌟 ĐẶC ĐIỂM THIẾT KẾ & TÍNH NĂNG NỔI BẬT

### 1. Giao diện Công nghiệp Chuyên nghiệp (Loại bỏ hoàn toàn cảm giác AI / Vibe-coding)
- **Vector SVG Đơn sắc (Monochrome 1.5px Stroke):** Thay thế toàn bộ emoji bằng biểu tượng vector kỹ thuật sắc nét, cùng tông màu Ant Design dark theme (`#161b22`, `#30363d`, `#58a6ff`).
- **Ngăn kéo neo đáy giữ trạng thái (Persistent Bottom Drawer):**
  - Không còn modal to đùng che khuất màn hình 3D.
  - Neo cố định ở đáy màn hình CVAT, có thanh Splitter kéo co giãn độ cao tùy ý.
  - Thu nhỏ / mở rộng tức thì trong **0ms** (dữ liệu point cloud và lịch sử undo luôn giữ nguyên trong RAM, không tải lại).
- **Popup 1-Chạm trên thanh Extension (Chrome Action Popup):**
  - Tự động nhận diện URL CVAT hiện tại.
  - Bấm nút "Kích hoạt trên domain này" là extension tự cấp quyền và tiêm script ngay lập tức mà không cần mở tab Cài đặt rườm rà.

### 2. Tích hợp Menu 3 Chấm (⋯) của Cuboid trên Sidebar CVAT & HUD
- Bấm vào nút **3 chấm (`⋯`)** trên dòng Track ở Sidebar CVAT hoặc trên thanh Mini-HUD:
  - `Sửa chuỗi frame (Mở Drawer)` [Phím `Alt + Space`]
  - `Chuẩn hóa Size L/W/H`
  - `Đảo đầu 180° (Frame này)` [Phím `F`]
  - `Đảo đầu 180° (Toàn bộ track)` [Phím `Shift + F`]
  - `Hút đáy sát mặt đất (Snap Ground)` [Phím `G`]
  - `Kiểm tra va chạm Overlap`
  - `Bảng phím tắt CAD` [Phím `?`]

### 3. Thanh Công cụ Nổi Mini (Floating Mini-HUD) trên Khung nhìn 3D
- Xuất hiện bán trong suốt ở góc trên màn hình 3D khi bạn chọn một cuboid:
  - Hiển thị nhãn và Track ID.
  - **Đếm điểm LiDAR thời gian thực:** Hiển thị số lượng điểm bên trong box (ví dụ `142 pts`). Nếu vô tình kéo box ra khoảng trống không có điểm nào (`0 pts`), huy hiệu chuyển màu đỏ/vàng cảnh báo "Box rỗng!" ngay lập tức.
  - Các nút thao tác nhanh: `[180°]`, `[Hút đất]`, `[Khóa size]`, `[Soi vệt]`, `[Profile]`, `[Sửa chuỗi]`.

### 4. Vệt Quỹ đạo Chuyển động & Biểu đồ Vận tốc Mini (Speed Sparkline)
- **Đồ thị sóng vận tốc tích hợp ngay trên Drawer:**
  - Tính toán quãng đường di chuyển $\Delta d$ giữa các frame của xe.
  - Đánh dấu chấm đỏ neon cảnh báo những frame có hiện tượng nhảy cóc tốc độ bất thường (> 3m/frame).
  - Bấm chuột vào bất kỳ điểm nào trên đồ thị -> CVAT tự động nhảy ngay đến frame đó.
- **Giữ phím `Alt + H` (Hold to Peek Ghost Frames):**
  - Nhấn giữ phím `Alt + H` (hoặc giữ nút `Soi vệt` trên HUD) để soi tức thời khung xe và điểm laser của 2 frame trước trên màn hình 3D. Nhả phím ra là tắt, không cần bấm lùi frame liên tục.

### 5. Thao tác Hàng loạt & Nội suy Chọn lọc (Selective Interpolation)
- Giữ `Shift + Click` để chọn dải nhiều frame liên tiếp trong bảng.
- **Kéo chuột dịch chuyển đồng thời (Real-time Batch Drag):** Kéo chuột ở một frame, tất cả các frame đã chọn dịch chuyển đồng thời.
- **Nội suy chọn lọc:**
  - Cho phép chọn riêng lẻ: Nội suy vị trí $(X, Y, Z)$, Nội suy góc quay Yaw (đường tròn ngắn nhất), và **Khóa kích thước $(L, W, H)$** để xe không bị biến dạng khi nội suy.
- **Xóa / Chốt Keyframe hàng loạt.**

### 6. Quét Trùng lặp & Ma trận 3D IoU Heatmap (Case 3)
- Thuật toán cắt đa giác Sutherland-Hodgman tính $IoU_{3D}$ và tỷ lệ đè nhau.
- Quét toàn bộ Job để phát hiện lỗi AI pre-labeling tạo 2 box cho cùng 1 xe.
- Bảng ma trận nhiệt hiển thị độ trùng lặp giữa các track trong từng frame.

### 7. Đồng bộ 2 Chiều Trực tiếp trong RAM (In-Memory Live Mode)
- Đăng ký qua `window.cvatUI.registerComponent()`.
- Cập nhật trực tiếp `ObjectState` trong RAM và tự động kích hoạt **nút Save màu xanh gốc của CVAT**.
- Đảm bảo tính toàn vẹn dữ liệu, không ghi đè mất mát khi làm việc nhóm hoặc khi mất mạng tạm thời.

---

## ⌨️ BẢNG PHÍM TẮT CHUẨN CAD (Hotkeys Cheatsheet)

| Phím tắt | Tác dụng |
| :--- | :--- |
| **`F`** hoặc **`Alt + F`** | Đảo chiều đầu xe 180° (Frame hiện tại) |
| **`Shift + F`** | Đảo chiều đầu xe 180° cho toàn bộ các frame của Track |
| **`G`** hoặc **`Alt + G`** | Tự động hút đáy box sát mặt đất theo điểm LiDAR |
| **Giữ phím `Alt + H`** | Bật chế độ soi vệt chuyển động & điểm laser 2 frame trước (Nhả phím để tắt) |
| **`Alt + Space`** hoặc **`Ctrl + \``** | Thu nhỏ / Mở rộng ngăn kéo đáy (Toggle Drawer) |
| **`F11`** | Phóng to / Thu nhỏ ngăn kéo toàn màn hình (Fullscreen Studio) |
| **`Shift + Click`** | Chọn dải nhiều frame liên tiếp trong bảng |
| **`Ctrl + A (Case 2)`** | Chọn toàn bộ (hoặc bỏ chọn) tất cả frame đang hiển thị |
| **`Esc (Case 2)`** | Hủy bỏ nhanh vùng chọn các frame |
| **`Home` / **`End (Case 2)`** | Nhảy tức thì tới frame đầu tiên / cuối cùng đang hiển thị |
| **`↑`** / **`↓ (Case 2)`** | Lùi / Tiến 1 frame liền kề trong danh sách hiển thị |
| **`Shift + ↑` / **`Shift + ↓ (Case 2)`** | Mở rộng dải chọn frame liên tiếp bằng bàn phím (Range Selection) |
| **`PageUp` / **`PageDown (Case 2)`** | Nhảy lướt nhanh 5 frame trong danh sách hiển thị |
| **`Ctrl + Z`** | Hoàn tác (Undo) |
| **`Ctrl + Y`** | Làm lại (Redo) |
| **`Ctrl + S`** | Lưu thay đổi vào RAM và bấm nút Save của CVAT |
| **`Nút ⋯ (Sidebar / HUD)`** | Mở các công cụ 3D Helper tích hợp trong menu Cuboid của CVAT |
| **`?`** | Bật bảng hướng dẫn phím tắt |

---

## 🛠 HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG

1. Mở trình duyệt Chrome hoặc Edge, truy cập: `chrome://extensions/`
2. Bật chế độ nhà phát triển (**Developer mode**) ở góc phải trên.
3. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục:  
   `c:\oD\Project\Cvat-tool\cvat-3d-super-helper`
4. Mở trang CVAT của bạn (kể cả IP nội bộ của công ty).
5. Bấm vào biểu tượng extension trên thanh trình duyệt -> Bấm **"Kích hoạt trên domain này"**.
6. Công cụ sẽ tự động xuất hiện trên CVAT và sẵn sàng sử dụng!
