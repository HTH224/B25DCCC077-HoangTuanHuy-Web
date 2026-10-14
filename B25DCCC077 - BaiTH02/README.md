# Thời tiết Việt Nam

Ứng dụng React + TypeScript tra cứu thời tiết hiện tại và dự báo 7 ngày cho 8 thành phố Việt Nam. Dữ liệu lấy trực tiếp từ Open-Meteo, không cần API key.

## Chạy ứng dụng

```bash
  npm install
  npm run dev
```

Mở địa chỉ local mà Vite hiển thị trong terminal. Để tạo bản build production, chạy `npm run build`.

## Tính năng

- Chọn Hà Nội, Hải Phòng, Huế, Đà Nẵng, Nha Trang, Đà Lạt, TP. Hồ Chí Minh hoặc Cần Thơ.
- Hiển thị nhiệt độ, độ ẩm, gió, thời điểm cập nhật và dự báo 7 ngày.
- Trạng thái chờ, tải, lỗi và nút thử lại.
- Chuyển °C/°F từ dữ liệu đã tải; tốc độ gió hiển thị theo km/h.
- Tìm tên thành phố không phân biệt dấu và lưu thành phố yêu thích trên thiết bị.
- Từ 768px dùng bố cục hai cột; dưới 768px xếp dọc.
