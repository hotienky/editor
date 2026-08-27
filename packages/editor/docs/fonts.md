# Font tích hợp, font riêng và CDN

Kindy Editor dùng cùng một font source cho Canvas layout và export. Vì vậy font
không chỉ cần hiển thị được trong CSS: exporter còn phải đọc được binary font để
đo glyph và nhúng vào PDF. Font ngoài hiện hỗ trợ **TTF/OTF**; WOFF/WOFF2 chưa dùng
được cho export PDF.

## Khai báo nhiều font trực tiếp

```ts
import { KindyEditor, type FontsConfig } from "@kindy/docx-editor";

const fonts: FontsConfig = {
  // Các URL tương đối bên dưới được ghép với thư mục CDN có version.
  baseUrl: "https://cdn.example.vn/kindy-fonts/2026-08/",
  fonts: [
    {
      family: "Inter",
      label: "Inter",
      faces: {
        regular: "inter/Inter-Regular.ttf",
        bold: "inter/Inter-Bold.ttf",
        italic: "inter/Inter-Italic.ttf",
        boldItalic: "inter/Inter-BoldItalic.ttf",
      },
      sizing: { ascent: 0.969, descent: 0.241 },
    },
    {
      family: "Noto Serif",
      faces: { regular: "noto-serif/NotoSerif-Regular.otf" },
      sizing: { ascent: 1.069, descent: 0.293 },
    },
  ],
};

const editor = new KindyEditor({
  container: document.querySelector("#editor")!,
  locale: "vi",
  fonts,
});
```

`regular` là bắt buộc. Face bị thiếu sẽ dùng lại Regular, bảo đảm preview và export
không tự tạo faux-bold/faux-italic khác nhau. `sizing` là ascent/descent chia cho
units-per-em của font; nên lấy từ `hhea`/`OS/2` của chính file font.

## Dùng font manifest trên CDN

Ứng dụng có thể đưa hàng loạt family vào một catalog có version:

```json
{
  "schemaVersion": "1.0",
  "baseUrl": "./files/",
  "fonts": [
    {
      "family": "Inter",
      "faces": {
        "regular": "Inter-Regular.ttf",
        "bold": "Inter-Bold.ttf"
      },
      "sizing": { "ascent": 0.969, "descent": 0.241 }
    },
    {
      "family": "Noto Serif",
      "faces": { "regular": "NotoSerif-Regular.otf" },
      "sizing": { "ascent": 1.069, "descent": 0.293 }
    }
  ]
}
```

Sau đó chỉ cần truyền URL catalog:

```ts
new KindyEditor({
  container,
  fonts: {
    manifests: [
      "https://cdn.example.vn/kindy-fonts/2026-08/manifest.json",
      {
        url: "https://static.example.vn/brand-fonts/manifest.json",
        baseUrl: "https://static.example.vn/brand-fonts/files/",
      },
    ],
    // Khai báo trực tiếp luôn ưu tiên hơn manifest nếu trùng family.
    fonts: [companyFont],
  },
});
```

Catalog lỗi, timeout hoặc sai schema sẽ bị bỏ qua riêng lẻ; editor vẫn mở bằng
font tích hợp sẵn và các font còn lại.

## CDN có xác thực hoặc signed URL

`loader` được dùng chung khi tải manifest, khi hiển thị Canvas và khi chuẩn bị font
cho export. Binary đã tải được truyền vào worker; token và hàm loader không đi vào
worker.

```ts
new KindyEditor({
  container,
  fonts: {
    manifests: ["https://assets.example.vn/fonts/manifest.json"],
    loader: async (request, signal) => {
      const response = await fetch(request.url, {
        signal,
        headers: { Authorization: `Bearer ${await getAssetToken()}` },
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Font HTTP ${response.status}`);
      return response.arrayBuffer();
    },
  },
});
```

`request.kind` là `manifest` hoặc `font`; request font còn có `family` và `style`
để ứng dụng ghi log, cấp signed URL hoặc áp dụng policy riêng.

## Cấu hình CDN khuyến nghị

- Cho phép CORS từ domain chạy editor, hoặc dùng `loader` qua transport của hệ thống.
- Đặt version bất biến trong URL và trả `Cache-Control: public, max-age=31536000, immutable`.
- Không ghi đè file font ở cùng URL; đổi version khi binary hoặc metrics thay đổi.
- Tự host font thương mại theo đúng license. Không đưa Times New Roman lên CDN công
  cộng nếu tổ chức chưa có quyền phân phối.
- Giữ manifest dưới 1 MB và mỗi font dưới 10 MB. Request bị giới hạn 15 giây để một
  CDN lỗi không treo quá trình mở editor.
- Kiểm thử golden DOCX/PDF sau khi đổi font hoặc metrics vì thay đổi metrics có thể
  làm thay đổi điểm xuống dòng và phân trang.

## Quan hệ với dung lượng bundle

Font khai báo qua URL/manifest không được đóng vào bundle JavaScript của
`kindy-editor`. Vì vậy có thể mở rộng catalog mà không làm tarball npm phình theo.
Ở bước tối ưu tiếp theo, catalog lớn nên được tải theo family/style mà tài liệu thực
sự sử dụng thay vì preload toàn bộ catalog.
