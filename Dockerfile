# Sử dụng Nginx phiên bản siêu nhẹ (Alpine)
FROM nginx:alpine

# Xóa trang cấu hình mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy toàn bộ mã nguồn vào thư mục public của Nginx
COPY . /usr/share/nginx/html/

# Expose port 80 để truy cập
EXPOSE 80

# Chạy Nginx ở chế độ foreground sau khi đã thay thế API_URL
CMD ["/bin/sh", "-c", "sed -i \"s|API_URL_PLACEHOLDER|${API_URL:-http://localhost:8081/api/v1}|g\" /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]
