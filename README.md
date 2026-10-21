# CVAT 3D Super Pro (Chrome Extension)
**Tác giả & Ý tưởng:** `taquanglocit-tech`  
**Mục đích:** Công cụ hỗ trợ gán nhãn 3D LiDAR & Bounding Box cho xe tự lái trên nền tảng CVAT.

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Hiển thị Điểm LiDAR kèm Cường độ phản xạ (LiDAR Intensity & Dimness):**
   - Đọc trực tiếp trường `intensity` / `reflectance` từ file `.pcd` (cả 3 định dạng: ascii, binary, binary_compressed).
   - Shader WebGL ánh xạ độ sáng và độ mờ tự nhiên: Kim loại và biển báo sáng rõ, mặt đường tối và sương mù mờ nhạt.
   - Thanh trượt lọc nhiễu linh hoạt (Noise Filter).

2. **Nhận diện Trùng lặp & Ma trận 3D IoU Heatmap (Case 3):**
   - Thuật toán cắt đa giác OBB Sutherland-Hodgman tính toán thể tích phần giao 3D và hệ số $IoU_{3D}$.
   - Nút **Quét toàn Job**: Tự động phát hiện tất cả các cặp box bị đè nhau do AI pre-labeling tạo trùng lặp.
   - Bảng **Ma trận nhiệt (Heatmap Matrix)** hiển thị tỷ lệ lồng nhau giữa các Track ID trong frame.
   - Bấm vào cảnh báo để nhảy ngay đến frame bị lỗi; hiển thị tag cảnh báo đỏ `⚠️ Đè #ID` trực tiếp trên từng dòng frame ở Case 2.

3. **Ghost Frames / Onion Skinning (Lớp phủ bóng ma frame lân cận):**
   - Bấm phím tắt **`G`** để bật bóng ma: Hiển thị box và điểm laser của frame trước ($t-1$, viền xanh) và frame sau ($t+1$, viền cam) lồng vào frame hiện tại.
   - Áp dụng phép biến đổi toạ độ tương đối của vật thể (Object-centric Coordinate Transform), giúp so khớp chuẩn xác vị trí nắp ca-pô, mũi xe và viền xe.

4. **Thao tác Hàng loạt Đa Frame & Kéo Chuột Đồng Thời (Real-Time Batch Drag):**
   - Giữ `Shift` để chọn một dải frame liên tục (Range Selection như Excel), hoặc `Ctrl` để chọn từng frame rời rạc.
   - **Kéo chuột dịch chuyển đồng thời:** Khi chọn nhiều frame, bạn chỉ cần nắm kéo box ở 1 ô, TẤT CẢ các frame đang chọn sẽ tự động dịch chuyển theo thời gian thực!
   - Tịnh tiến đồng loạt bằng số $(\Delta X, \Delta Y, \Delta Z)$ cho cả đoạn xe đỗ hoặc đoạn đường bị rung lắc.
   - Phím tắt **`R`**: Đảo ngược đầu xe $180^\circ$ tức thì cho các frame đã chọn.
   - Phím tắt **`F`**: Hút đáy box chạm đất hàng loạt cho các frame đã chọn.
   - Nút **🗑 Xóa Keyframe** và **⭐ Chốt Keyframe** hàng loạt.

5. **Nội suy Chọn lọc (Selective Interpolation Panel):**
   - Nút **⚡ Nội suy đoạn này** khi chọn một khoảng frame:
     - `[x] Nội suy Vị trí (X, Y, Z)`: Tính lại đường đi thẳng đều hoặc mượt mà.
     - `[x] 🔒 Khóa cứng Kích thước (L, W, H)`: Giữ nguyên 100% kích thước chuẩn của xe, bảo vệ xe không bị méo mó khi nội suy.
     - `[x] Nội suy Góc quay Yaw`: Xoay theo góc ngắn nhất, triệt tiêu lỗi xe tự quay vòng $360^\circ$.

6. **Đồng bộ trực tiếp qua Bộ nhớ RAM CVAT (In-Memory Live Mode):**
   - Đăng ký làm plugin chính thức qua `window.cvatUI.registerComponent()`.
   - Cập nhật trực tiếp `ObjectState`, kích hoạt **nút Save gốc của CVAT**.
   - Lưu trữ an toàn khi mất mạng, tương thích hoàn hảo với lịch sử hoàn tác `Ctrl+Z` / `Ctrl+Y` của CVAT.

---

## 🛠 HƯỚNG DẪN CÀI ĐẶT

1. Mở trình duyệt Chrome hoặc Microsoft Edge, truy cập: `chrome://extensions/`
2. Bật chế độ nhà phát triển (**Developer mode**) ở góc phải trên.
3. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục:  
   `c:\oD\Project\Cvat-tool\cvat-3d-super-helper`
4. Bấm vào icon mảnh ghép 🧩 trên thanh công cụ Chrome, tìm **CVAT 3D Super Pro** và ghim 📌 ra thanh công cụ.
5. Mở trang Cài đặt (Options) của Extension để thêm URL máy chủ CVAT của bạn (ví dụ: `https://cvat.mycompany.vn` hoặc `http://localhost:8080`).
6. Mở hoặc tải lại trang Job 3D trên CVAT: Nút **🚀 3D Pro** sẽ xuất hiện trên thanh công cụ góc phải của CVAT!

---

## ⌨️ BẢNG PHÍM TẮT NHANH

| Phím tắt | Chức năng |
| :--- | :--- |
| **G** | Bật / Tắt chế độ **Ghost Frames** (Xem bóng ma và điểm laser frame $t-1$ và $t+1$) |
| **D** | Bật / Tắt **Gom điểm đa frame (Densify)**: Tích lũy điểm LiDAR xung quanh để thấy rõ dáng xe |
| **R** | **Đảo chiều đầu xe 180°** tức thì (Heading Quick-Flip) |
| **F** | **Hút đáy box chạm đất** tự động theo mặt đường LiDAR (Floor Snap) |
| **O** | Bật / Tắt trạng thái Outside |
| **Shift + Kéo xoay** | Xoay góc Yaw bám theo bước tròn $5^\circ$ |
| **Ctrl + S** | Ghi thay đổi vào RAM CVAT và kích hoạt nút Save gốc |
| **Ctrl + Z / Ctrl + Y** | Hoàn tác / Làm lại |

---

## 🔒 CAM KẾT BẢO MẬT (ENTERPRISE SECURITY)
- **Zero External Requests:** 100% mã nguồn chạy nội bộ trên máy người dùng, tuyệt đối không gửi bất kỳ dữ liệu point cloud, ảnh hay toạ độ box nào ra internet.
- **Same-Origin Only:** Chỉ giao tiếp với đúng domain của tab CVAT đang mở thông qua cookie và phiên đăng nhập có sẵn của bạn.
