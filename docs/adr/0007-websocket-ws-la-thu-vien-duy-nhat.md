# Real-time bằng WebSocket qua thư viện `ws`, thư viện chạy thật duy nhất

Game giữ nguyên tắc không dùng thư viện. Ngoại lệ duy nhất là `ws`, chỉ dùng phía server. Trình duyệt dùng WebSocket có sẵn. Node chưa có WebSocket server sẵn, mà làng chung cần gửi vị trí người chơi 6 lần mỗi giây theo hai chiều. SSE + `fetch` không cần thư viện, nhưng mỗi lần trình duyệt gửi lên là một request HTTP, quá tốn cho việc gửi vị trí liên tục. Đăng nhập, lưu vườn và mua bán vẫn đi qua HTTP. Playwright chỉ là thư viện lúc phát triển, không tính vào ngoại lệ này.
