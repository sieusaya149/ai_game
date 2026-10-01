# Bản chơi đơn: chỉ cần phục vụ file tĩnh trong public/. Khi làm bản online sẽ đổi sang chạy server Node.
FROM nginx:1.27-alpine
COPY public /usr/share/nginx/html
